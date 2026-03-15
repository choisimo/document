const openNotebookEnabled = '%%OPEN_NOTEBOOK_ENABLED%%' !== '%%' + 'OPEN_NOTEBOOK_ENABLED' + '%%'
  ? '%%OPEN_NOTEBOOK_ENABLED%%' === 'true'
  : false;

const openNotebookConfig = {
  enabled: openNotebookEnabled,
  apiUrl: '%%OPEN_NOTEBOOK_URL%%' !== '%%' + 'OPEN_NOTEBOOK_URL' + '%%'
    ? '%%OPEN_NOTEBOOK_URL%%'
    : 'http://localhost:8090',
  apiToken: '%%OPEN_NOTEBOOK_TOKEN%%' !== '%%' + 'OPEN_NOTEBOOK_TOKEN' + '%%'
    ? '%%OPEN_NOTEBOOK_TOKEN%%'
    : '',
  maxResults: 5,
  contextMaxChars: 3000,
};

const openNotebookPromptPrefix = '당신에게는 Open Notebook 지식 베이스의 컨텍스트가 제공됩니다. 이 컨텍스트를 최우선으로 참고하여 답변하세요. 지식 베이스에 관련 정보가 있다면 반드시 해당 내용을 기반으로 답변해주세요.';

window.AI_CONFIG = {
  // Build time에 주입됨 - placeholder는 GitHub Actions에서 대체됨
  apiBaseUrl: (('%%AI_API_BASE_URL%%' !== '%%' + 'AI_API_BASE_URL' + '%%'
    ? '%%AI_API_BASE_URL%%'
    : 'https://ai.dothechi.com/v1')).replace(/\/+$/, ''),
  
  apiToken: '%%AI_API_TOKEN%%' !== '%%' + 'AI_API_TOKEN' + '%%' 
    ? '%%AI_API_TOKEN%%' 
    : '',
  
  // 모델명이 설정되어 있으면 우선 사용, 없으면 백엔드 기본 모델 사용
  modelName: '%%AI_MODEL_NAME%%' !== '%%' + 'AI_MODEL_NAME' + '%%' 
    ? '%%AI_MODEL_NAME%%' 
    : null,
  
  openNotebook: openNotebookConfig,
  
  // 챗봇 기본 설정
  chatbot: {
    welcomeMessage: '안녕하세요! Documentation Hub AI 어시스턴트입니다. 문서에 대해 궁금한 점을 물어보세요.',
    placeholder: '메시지를 입력하세요...',
    systemPrompt: `${openNotebookEnabled ? `${openNotebookPromptPrefix}

` : ''}당신은 Documentation Hub(docs.nodove.com)의 AI 어시스턴트입니다.
이 사이트는 인프라, 개발, 보안, Docker, Linux 등 기술 문서를 제공합니다.

중요 지침:
1. 반드시 문서에 기반하여 답변하세요. 확실하지 않으면 추측하지 마세요.
2. 문서에서 찾을 수 없는 내용은 "해당 내용은 현재 문서에서 찾을 수 없습니다"라고 솔직하게 답하세요.
3. 답변 시 관련 문서 경로나 링크를 함께 제공하세요 (예: /infrastructure/proxmox/cluster/).
4. 기술적 사실은 반드시 문서 내용에 근거해야 하며, 만들어내지 마세요.
5. 답변은 한국어로 작성하고, 마크다운 형식을 사용하세요.
6. 코드 예시는 실제 문서의 내용만 사용하세요.`
  }
};
