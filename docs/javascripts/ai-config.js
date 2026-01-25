/**
 * AI Configuration - Values injected during build from GitHub Secrets
 * 
 * GitHub Secrets:
 * - AI_API_BASE_URL: AI API 서버 URL (기본값: https://ai.dothechi.com)
 * - AI_API_TOKEN: API 인증 토큰
 * - AI_MODEL_NAME: 사용할 모델명 (선택적 - 백엔드 기본 모델 사용 시 비워둠)
 */
window.AI_CONFIG = {
  // Build time에 주입됨 - placeholder는 GitHub Actions에서 대체됨
  apiBaseUrl: '%%AI_API_BASE_URL%%' !== '%%' + 'AI_API_BASE_URL' + '%%' 
    ? '%%AI_API_BASE_URL%%' 
    : 'https://ai.dothechi.com',
  
  apiToken: '%%AI_API_TOKEN%%' !== '%%' + 'AI_API_TOKEN' + '%%' 
    ? '%%AI_API_TOKEN%%' 
    : '',
  
  // 모델명이 설정되어 있으면 우선 사용, 없으면 백엔드 기본 모델 사용
  modelName: '%%AI_MODEL_NAME%%' !== '%%' + 'AI_MODEL_NAME' + '%%' 
    ? '%%AI_MODEL_NAME%%' 
    : null,
  
  // 챗봇 기본 설정
  chatbot: {
    welcomeMessage: '안녕하세요! Documentation Hub AI 어시스턴트입니다. 문서에 대해 궁금한 점을 물어보세요.',
    placeholder: '메시지를 입력하세요...',
    systemPrompt: `당신은 Documentation Hub의 AI 어시스턴트입니다.
이 문서 사이트는 인프라, 개발, 보안, Docker 설정 등 기술 문서를 제공합니다.
사용자가 문서 내용에 대해 질문하면 친절하고 정확하게 답변해주세요.
답변은 한국어로 작성하고, 관련 문서 링크가 있다면 안내해주세요.
마크다운 형식으로 답변하세요.`
  }
};
