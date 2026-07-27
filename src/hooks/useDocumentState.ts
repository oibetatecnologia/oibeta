import { useState } from 'react';

/**
 * useDocumentState
 * Estado local da geração de documentos.
 *
 * Responsabilidade:
 * - manter template selecionado;
 * - manter entidade/cidade;
 * - manter assunto;
 * - gerar conteúdo textual local.
 */
export default function useDocumentState() {
  const [selecteddocTemplate, setSelectedDocTemplate] = useState('oficio');
  const [docCityName, setDocCityName] = useState('Prefeitura de Rio Claro');
  const [docSubject, setDocSubject] = useState('Parceria e Cooperação Inteligente de Gestão Pública');
  const [generatedDoc, setGeneratedDoc] = useState('');

  const handleGenerateDocument = () => {
    if (selecteddocTemplate === 'oficio') {
      setGeneratedDoc(
        `OFÍCIO DIGITAL Nº GAB-081/2026\n` +
        `Destinatário: Excelentíssimo Senhor Prefeito da ${docCityName}\n\n` +
        `Assunto: Proposta Executiva de Governança Digital e Gestão Inteligente\n\n` +
        `Senhor Prefeito,\n\n` +
        `Com os nossos cordiais cumprimentos, vimos por meio deste apresentar formalmente à equipe técnica e estratégica da ${docCityName} a solução tecnológica Oi Beta. Através de inteligência preditiva e monitoramento sincronizado de metas, esta tecnologia visa unificar o gerenciamento de convênios, licitações ativas e andamento de relatórios em tempo real.\n\n` +
        `Colocamo-nos à inteira disposição de Vossa Excelência para agendamento de chamada executiva via Oi Beta para demonstração dos canais automatizados de apoio à tomada de decisão.\n\n` +
        `Atenciosamente,\n` +
        `Beta - Inteligência que Transforma\n` +
        `Oi Beta Inc. Serviços Estratégicos S/A`
      );
      return;
    }

    if (selecteddocTemplate === 'ata') {
      setGeneratedDoc(
        `ATA DA REUNIÃO EXTRAORDINÁRIA DE ALINHAMENTO DE PROJETO\n` +
        `Escopo: ${docSubject || 'Governança Inteligente'}\n` +
        `Data: ${new Date().toLocaleDateString('pt-BR')} • Local: Gabinete de Gestão Integrada\n\n` +
        `Participantes:\n` +
        `- Equipe de Secretários de Planejamento e Inovação\n` +
        `- Diretoria de Tecnologia Oi Beta\n\n` +
        `TÓPICOS DISCUTIDOS:\n` +
        `1. Apresentação do diagnóstico técnico das secretarias municipais.\n` +
        `2. Definição do cronograma piloto do módulo Beta Gov na prefeitura local.\n` +
        `3. Aprovação do alinhamento estatístico e centralização de metas e memórias.\n\n` +
        `ENCAMINHAMENTOS:\n` +
        `Ficou acertado que a próxima etapa envolverá a parametrização dos editais no Beta Licita para monitoramento automático. Sem mais a tratar, lavra-se este documento assinado digitalmente.`
      );
      return;
    }

    setGeneratedDoc(
      `CONTRATO PRELIMINAR DE COOPERAÇÃO E INTELIGÊNCIA EXECUTIVA\n` +
      `Contratada: OI BETA TECNOLOGIA CORPORATIVA S.A.\n` +
      `Parceiro: Executivo da ${docCityName}\n\n` +
      `CLÁUSULA PRIMEIRA - DO OBJETO\n` +
      `O presente acordo preliminar visa a outorga experimental de licenças operacionais de uso da plataforma Oi Beta para avaliação de desempenho na gestão de projetos públicos e métricas de campanhas municipais.\n\n` +
      `CLÁUSULA SEGUNDA - DA CONFIDENCIALIDADE\n` +
      `As partes concordam em guardar absoluto sigilo quanto às informações de memórias inseridas no banco corporativo unun-cloud.\n\n` +
      `Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}\n` +
      `Assinatura de Concordância de Termos Operacionais.`
    );
  };

  return {
    selecteddocTemplate,
    setSelectedDocTemplate,
    docCityName,
    setDocCityName,
    docSubject,
    setDocSubject,
    generatedDoc,
    handleGenerateDocument,
  };
}
