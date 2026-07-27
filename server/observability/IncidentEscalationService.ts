import type { NotificationCenterService } from "../notifications/NotificationCenterService";
import type { NotificationPreferenceService } from "../notifications/NotificationPreferenceService";
import type { NotificationDeliveryService } from "../notifications/NotificationDeliveryService";
import type { AdminDirectoryService } from "../admin/AdminDirectoryService";
import type { OperationalIncidentService } from "./OperationalIncidentService";
import type { OperationalIncident } from "./OperationalIncidentTypes";
import type {
  IncidentEscalationAlert,
  IncidentEscalationLevel,
  IncidentEscalationResult,
} from "./IncidentEscalationTypes";

const ACTIVE_NOTIFICATION_STATUSES = new Set([
  "UNREAD",
  "PENDING",
  "ACTIVE",
]);

export class IncidentEscalationService {
  constructor(
    private readonly incidentService: OperationalIncidentService,
    private readonly directoryService: AdminDirectoryService,
    private readonly notificationCenter: NotificationCenterService,
    private readonly notificationPreferences: NotificationPreferenceService,
    private readonly notificationDeliveries: NotificationDeliveryService,
  ) {}

  async escalate(
    organizationId: string,
    incidentId: string,
  ): Promise<IncidentEscalationResult> {
    const incidents = await this.incidentService.list(
      organizationId,
      500,
    );
    const incident = incidents.find(
      (item) => item.id === incidentId,
    );

    if (!incident) {
      throw new Error("Incidente não encontrado.");
    }

    if (incident.status === "resolved") {
      throw new Error(
        "Incidentes resolvidos não podem ser escalados.",
      );
    }

    const escalationLevel = this.resolveLevel(incident);
    const users = await this.directoryService.listUsers(
      organizationId,
    );
    const eligibleRecipients = users.filter((user) =>
      this.shouldReceive(
        user.profile,
        user.status,
        escalationLevel,
      ),
    );
    const recipients = [];

    for (const user of eligibleRecipients) {
      const preference = await this.notificationPreferences.get(
        organizationId,
        user.id,
      );

      if (
        this.notificationPreferences.shouldDeliverIncidentAlert(
          preference,
          escalationLevel,
        )
      ) {
        recipients.push(user);
      }
    }

    const existing = await this.notificationCenter.listByEntity(
      organizationId,
      "operational_incident",
      incident.id,
      500,
    );

    const alerts: IncidentEscalationAlert[] = [];
    let notificationsCreated = 0;
    let notificationsReused = 0;

    for (const recipient of recipients) {
      const reusable = existing.find(
        (notification) =>
          notification.userId === recipient.id &&
          ACTIVE_NOTIFICATION_STATUSES.has(
            String(notification.status || "").toUpperCase(),
          ) &&
          notification.metadataJson?.escalationLevel ===
            escalationLevel,
      );

      if (reusable) {
        notificationsReused += 1;
        alerts.push(
          this.toAlert(reusable, incident, escalationLevel),
        );
        continue;
      }

      const saved = await this.notificationCenter.create({
          organizationId,
          userId: recipient.id,
          title: this.buildTitle(incident, escalationLevel),
          message: this.buildMessage(incident),
          notificationType: "INCIDENT_ESCALATION",
          relatedEntityType: "operational_incident",
          relatedEntityId: incident.id,
          status: "UNREAD",
          metadataJson: {
            escalationLevel,
            incidentSeverity: incident.severity,
            incidentStatus: incident.status,
            occurrenceCount: incident.occurrenceCount,
            fingerprint: incident.fingerprint,
            targetTab: "platform_monitoring",
          },
        });

      try {
        await this.notificationDeliveries.recordDelivered({
          organizationId,
          notificationId: saved.id,
          userId: recipient.id,
        });
      } catch (deliveryError) {
        await this.notificationDeliveries.recordFailure({
          organizationId,
          notificationId: saved.id,
          userId: recipient.id,
          reason:
            deliveryError instanceof Error
              ? deliveryError.message
              : String(deliveryError),
        });
      }

      notificationsCreated += 1;
      alerts.push(
        this.toAlert(saved, incident, escalationLevel),
      );
    }

    const primaryOwner =
      incident.owner ||
      recipients[0]?.name ||
      "Equipe Oi Beta";

    const updatedIncident = await this.incidentService.update(
      organizationId,
      incident.id,
      {
        status:
          incident.status === "open"
            ? "investigating"
            : incident.status,
        owner: primaryOwner,
        resolutionNotes:
          incident.resolutionNotes ||
          `Escalado em ${new Date().toISOString()} para ${recipients.length} responsável(is).`,
      },
    );

    return {
      incident: updatedIncident,
      escalationLevel,
      recipients: recipients.length,
      notificationsCreated,
      notificationsReused,
      alerts,
    };
  }

  async listAlerts(
    organizationId: string,
    limit = 100,
  ): Promise<IncidentEscalationAlert[]> {
    const safeLimit = Math.max(1, Math.min(limit, 500));
    const notifications =
      await this.notificationCenter.listByEntity(
        organizationId,
        "operational_incident",
        undefined,
        safeLimit,
      );

    return notifications
      .filter(
        (notification) =>
          notification.notificationType ===
          "INCIDENT_ESCALATION",
      )
      .map((notification) => ({
        id: notification.id,
        organizationId: notification.organizationId,
        userId: notification.userId,
        title: notification.title,
        message: notification.message || "",
        escalationLevel:
          (notification.metadataJson?.escalationLevel as IncidentEscalationLevel | undefined) ||
          "standard",
        incidentId: notification.relatedEntityId || "",
        incidentSeverity:
          (notification.metadataJson?.incidentSeverity as OperationalIncident["severity"] | undefined) ||
          "medium",
        incidentStatus:
          (notification.metadataJson?.incidentStatus as OperationalIncident["status"] | undefined) ||
          "open",
        occurrenceCount: Number(
          notification.metadataJson?.occurrenceCount || 1,
        ),
        status: notification.status,
        createdAt: String(notification.createdAt),
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private resolveLevel(
    incident: OperationalIncident,
  ): IncidentEscalationLevel {
    if (incident.severity === "critical") return "critical";

    if (
      incident.severity === "high" ||
      incident.occurrenceCount >= 3
    ) {
      return "high";
    }

    return "standard";
  }

  private shouldReceive(
    profile: string,
    status: string,
    level: IncidentEscalationLevel,
  ): boolean {
    if (!["active", "invited"].includes(status)) return false;

    const normalized = String(profile || "").toLowerCase();
    const admins = new Set([
      "master_admin",
      "tenant_admin",
    ]);
    const leaders = new Set([
      "executive",
      "manager",
    ]);

    if (level === "critical") {
      return admins.has(normalized) || leaders.has(normalized);
    }

    if (level === "high") {
      return admins.has(normalized) || normalized === "executive";
    }

    return admins.has(normalized);
  }

  private buildTitle(
    incident: OperationalIncident,
    level: IncidentEscalationLevel,
  ): string {
    const prefix =
      level === "critical"
        ? "Incidente crítico"
        : level === "high"
          ? "Incidente prioritário"
          : "Incidente operacional";

    return `${prefix}: ${incident.title}`;
  }

  private buildMessage(
    incident: OperationalIncident,
  ): string {
    return `${incident.description} Status: ${incident.status}. Ocorrências: ${incident.occurrenceCount}.`;
  }

  private toAlert(
    notification: any,
    incident: OperationalIncident,
    escalationLevel: IncidentEscalationLevel,
  ): IncidentEscalationAlert {
    return {
      id: notification.id,
      organizationId: notification.organizationId,
      userId: notification.userId,
      title: notification.title,
      message: notification.message || "",
      escalationLevel,
      incidentId: incident.id,
      incidentSeverity: incident.severity,
      incidentStatus: incident.status,
      occurrenceCount: incident.occurrenceCount,
      status: notification.status,
      createdAt: String(notification.createdAt),
    };
  }
}
