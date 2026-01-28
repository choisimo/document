/**
 * AI Chatbot UI Component
 * 
 * 플로팅 챗봇 인터페이스
 * - 마크다운 렌더링
 * - 대화 기록 저장 (localStorage)
 * - 반응형 디자인
 */

class AIChatbot {
  constructor() {
    this.isOpen = false;
    this.messages = [];
    this.isTyping = false;
    this.container = null;
    this.messagesContainer = null;
    this.input = null;

    this.loadHistory();
    this.init();
  }

  /**
   * 챗봇 UI 초기화
   */
  init() {
    this.createStyles();
    this.createUI();
    this.bindEvents();
  }

  /**
   * 스타일 생성
   */
  createStyles() {
    if (document.getElementById('ai-chatbot-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'ai-chatbot-styles';
    styles.textContent = `
      /* ===================================== */
      /* FAB Button */
      /* ===================================== */
      .ai-chatbot-fab {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        z-index: 9998;
        padding: 0;
      }

      .ai-chatbot-fab:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 28px rgba(102, 126, 234, 0.5);
      }

      .ai-chatbot-fab svg {
        width: 28px;
        height: 28px;
        fill: white;
        transition: transform 0.3s ease;
      }

      .ai-chatbot-fab.open svg {
        transform: rotate(180deg);
      }

      /* ===================================== */
      /* Chat Container */
      /* ===================================== */
      .ai-chatbot-container {
        position: fixed;
        bottom: 100px;
        right: 24px;
        width: 400px;
        max-width: calc(100vw - 32px);
        height: 550px;
        max-height: calc(100vh - 140px);
        background: var(--md-default-bg-color, #fff);
        border-radius: 20px;
        box-shadow: 0 10px 50px rgba(0, 0, 0, 0.2);
        display: none;
        flex-direction: column;
        overflow: hidden;
        z-index: 9999;
        border: 1px solid var(--md-default-fg-color--lightest, #e0e0e0);
      }

      .ai-chatbot-container.open {
        display: flex;
        animation: chatbotSlideIn 0.3s ease;
      }

      @keyframes chatbotSlideIn {
        from {
          opacity: 0;
          transform: translateY(20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      /* ===================================== */
      /* Header */
      /* ===================================== */
      .ai-chatbot-header {
        padding: 18px 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        display: flex;
        align-items: center;
        gap: 14px;
        flex-shrink: 0;
      }

      .ai-chatbot-header-icon {
        width: 40px;
        height: 40px;
        background: rgba(255,255,255,0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .ai-chatbot-header-icon svg {
        width: 22px;
        height: 22px;
        fill: white;
      }

      .ai-chatbot-header-text {
        flex: 1;
        min-width: 0;
      }

      .ai-chatbot-header-title {
        font-weight: 600;
        font-size: 17px;
        margin: 0;
      }

      .ai-chatbot-header-subtitle {
        font-size: 13px;
        opacity: 0.85;
        margin: 2px 0 0 0;
      }

      .ai-chatbot-header-actions {
        display: flex;
        gap: 8px;
      }

      .ai-chatbot-header-btn {
        background: rgba(255,255,255,0.15);
        border: none;
        border-radius: 10px;
        padding: 8px;
        cursor: pointer;
        transition: background 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .ai-chatbot-header-btn:hover {
        background: rgba(255,255,255,0.25);
      }

      .ai-chatbot-header-btn svg {
        width: 18px;
        height: 18px;
        fill: white;
      }

      /* ===================================== */
      /* Messages Container */
      /* ===================================== */
      .ai-chatbot-messages {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        scroll-behavior: smooth;
      }

      .ai-chatbot-messages::-webkit-scrollbar {
        width: 6px;
      }

      .ai-chatbot-messages::-webkit-scrollbar-track {
        background: transparent;
      }

      .ai-chatbot-messages::-webkit-scrollbar-thumb {
        background: var(--md-default-fg-color--lighter, #ccc);
        border-radius: 3px;
      }

      /* ===================================== */
      /* Message Bubbles */
      /* ===================================== */
      .ai-chatbot-message {
        display: flex;
        gap: 10px;
        max-width: 100%;
        animation: messageIn 0.3s ease;
      }

      @keyframes messageIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .ai-chatbot-message.user {
        flex-direction: row-reverse;
      }

      .ai-chatbot-avatar {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .ai-chatbot-message.user .ai-chatbot-avatar {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      }

      .ai-chatbot-message.assistant .ai-chatbot-avatar {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }

      .ai-chatbot-avatar svg {
        width: 18px;
        height: 18px;
        fill: white;
      }

      .ai-chatbot-bubble {
        max-width: calc(100% - 50px);
        padding: 12px 16px;
        border-radius: 18px;
        font-size: 14px;
        line-height: 1.6;
        word-wrap: break-word;
        overflow-wrap: break-word;
        word-break: break-word;
      }

      .ai-chatbot-message.user .ai-chatbot-bubble {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-bottom-right-radius: 6px;
      }

      .ai-chatbot-message.assistant .ai-chatbot-bubble {
        background: var(--md-default-fg-color--lightest, #f0f0f0);
        color: var(--md-default-fg-color, #333);
        border-bottom-left-radius: 6px;
      }

      /* ===================================== */
      /* Markdown Styles in Bubble */
      /* ===================================== */
      .ai-chatbot-bubble p {
        margin: 0 0 10px 0;
      }

      .ai-chatbot-bubble p:last-child {
        margin-bottom: 0;
      }

      .ai-chatbot-bubble h1, 
      .ai-chatbot-bubble h2, 
      .ai-chatbot-bubble h3 {
        font-size: 15px;
        font-weight: 600;
        margin: 12px 0 8px 0;
      }

      .ai-chatbot-bubble h1:first-child,
      .ai-chatbot-bubble h2:first-child,
      .ai-chatbot-bubble h3:first-child {
        margin-top: 0;
      }

      .ai-chatbot-bubble pre {
        background: var(--md-code-bg-color, #2d2d2d);
        color: var(--md-code-fg-color, #f8f8f2);
        padding: 12px 14px;
        border-radius: 10px;
        overflow-x: auto;
        margin: 10px 0;
        font-size: 13px;
        max-width: 100%;
      }

      .ai-chatbot-bubble code {
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 13px;
      }

      .ai-chatbot-bubble :not(pre) > code {
        background: rgba(0,0,0,0.1);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 13px;
      }

      .ai-chatbot-message.user .ai-chatbot-bubble :not(pre) > code {
        background: rgba(255,255,255,0.2);
      }

      .ai-chatbot-bubble ul, 
      .ai-chatbot-bubble ol {
        margin: 8px 0;
        padding-left: 20px;
      }

      .ai-chatbot-bubble li {
        margin: 4px 0;
      }

      .ai-chatbot-bubble a {
        color: inherit;
        text-decoration: underline;
      }

      .ai-chatbot-bubble strong {
        font-weight: 600;
      }

      .ai-chatbot-bubble hr {
        border: none;
        border-top: 1px solid rgba(0,0,0,0.1);
        margin: 12px 0;
      }

      /* ===================================== */
      /* Typing Indicator */
      /* ===================================== */
      .ai-chatbot-typing {
        display: flex;
        gap: 5px;
        padding: 6px 10px;
        align-items: center;
      }

      .ai-chatbot-typing span {
        width: 8px;
        height: 8px;
        background: var(--md-default-fg-color--light, #888);
        border-radius: 50%;
        animation: typingBounce 1.4s infinite;
      }

      .ai-chatbot-typing span:nth-child(2) {
        animation-delay: 0.2s;
      }

      .ai-chatbot-typing span:nth-child(3) {
        animation-delay: 0.4s;
      }

      @keyframes typingBounce {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
        40% { transform: translateY(-8px); opacity: 1; }
      }

      /* ===================================== */
      /* Input Area */
      /* ===================================== */
      .ai-chatbot-input-area {
        padding: 14px 16px;
        border-top: 1px solid var(--md-default-fg-color--lightest, #e0e0e0);
        display: flex;
        gap: 10px;
        background: var(--md-default-bg-color, #fff);
        flex-shrink: 0;
      }

      .ai-chatbot-input {
        flex: 1;
        padding: 12px 18px;
        border: 2px solid var(--md-default-fg-color--lightest, #e0e0e0);
        border-radius: 25px;
        font-size: 14px;
        outline: none;
        background: var(--md-default-bg-color, #fff);
        color: var(--md-default-fg-color, #333);
        transition: border-color 0.2s, box-shadow 0.2s;
      }

      .ai-chatbot-input:focus {
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
      }

      .ai-chatbot-input::placeholder {
        color: var(--md-default-fg-color--light, #999);
      }

      .ai-chatbot-send-btn {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s, opacity 0.2s, box-shadow 0.2s;
        flex-shrink: 0;
      }

      .ai-chatbot-send-btn:hover:not(:disabled) {
        transform: scale(1.08);
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      }

      .ai-chatbot-send-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .ai-chatbot-send-btn svg {
        width: 22px;
        height: 22px;
        fill: white;
        margin-left: 2px;
      }

      /* ===================================== */
      /* Welcome Screen */
      /* ===================================== */
      .ai-chatbot-welcome {
        text-align: center;
        padding: 30px 20px;
        color: var(--md-default-fg-color--light, #666);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
      }

      .ai-chatbot-welcome-icon {
        width: 80px;
        height: 80px;
        margin: 0 auto 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 8px 30px rgba(102, 126, 234, 0.3);
      }

      .ai-chatbot-welcome-icon svg {
        width: 40px;
        height: 40px;
        fill: white;
      }

      .ai-chatbot-welcome h3 {
        margin: 0 0 10px 0;
        color: var(--md-default-fg-color, #333);
        font-size: 20px;
        font-weight: 600;
      }

      .ai-chatbot-welcome p {
        margin: 0 0 20px 0;
        font-size: 14px;
        line-height: 1.6;
      }

      .ai-chatbot-suggestions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: center;
        max-width: 300px;
      }

      .ai-chatbot-suggestion {
        padding: 10px 18px;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
        border: 1px solid rgba(102, 126, 234, 0.2);
        border-radius: 20px;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
        color: var(--md-default-fg-color, #333);
      }

      .ai-chatbot-suggestion:hover {
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
        border-color: rgba(102, 126, 234, 0.4);
        transform: translateY(-2px);
      }

      /* ===================================== */
      /* Mobile Responsive */
      /* ===================================== */
      @media (max-width: 480px) {
        .ai-chatbot-container {
          width: calc(100vw - 16px);
          right: 8px;
          left: 8px;
          bottom: 90px;
          height: calc(100vh - 110px);
          max-height: none;
          border-radius: 16px;
        }

        .ai-chatbot-fab {
          width: 56px;
          height: 56px;
          bottom: 20px;
          right: 20px;
        }

        .ai-chatbot-header {
          padding: 14px 16px;
        }

        .ai-chatbot-messages {
          padding: 12px;
        }

        .ai-chatbot-input-area {
          padding: 12px;
        }
      }

      /* ===================================== */
      /* Dark Mode */
      /* ===================================== */
      [data-md-color-scheme="slate"] .ai-chatbot-container {
        background: var(--md-default-bg-color);
        border-color: var(--md-default-fg-color--lightest);
      }

      [data-md-color-scheme="slate"] .ai-chatbot-message.assistant .ai-chatbot-bubble {
        background: var(--md-code-bg-color);
      }

      [data-md-color-scheme="slate"] .ai-chatbot-bubble :not(pre) > code {
        background: rgba(255,255,255,0.1);
      }

      [data-md-color-scheme="slate"] .ai-chatbot-suggestion {
        background: rgba(102, 126, 234, 0.15);
        border-color: rgba(102, 126, 234, 0.3);
      }
    `;
    document.head.appendChild(styles);
  }

  /**
   * UI 요소 생성
   */
  createUI() {
    // FAB 버튼 - 로봇 아이콘
    const fab = document.createElement('button');
    fab.className = 'ai-chatbot-fab';
    fab.setAttribute('aria-label', 'AI 챗봇 열기');
    fab.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5 2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5 2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 0 2.5-2.5 2.5 2.5 0 0 0-2.5-2.5z"/>
      </svg>
    `;
    this.fab = fab;

    // 챗봇 컨테이너
    const container = document.createElement('div');
    container.className = 'ai-chatbot-container';
    container.innerHTML = `
      <div class="ai-chatbot-header">
        <div class="ai-chatbot-header-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5 2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5 2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 0 2.5-2.5 2.5 2.5 0 0 0-2.5-2.5z"/>
          </svg>
        </div>
        <div class="ai-chatbot-header-text">
          <p class="ai-chatbot-header-title">AI 어시스턴트</p>
          <p class="ai-chatbot-header-subtitle">문서에 대해 물어보세요</p>
        </div>
        <div class="ai-chatbot-header-actions">
          <button class="ai-chatbot-header-btn ai-chatbot-clear-btn" title="대화 기록 삭제">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
          <button class="ai-chatbot-header-btn ai-chatbot-close-btn" title="닫기">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
      </div>
      <div class="ai-chatbot-messages"></div>
      <div class="ai-chatbot-input-area">
        <input type="text" class="ai-chatbot-input" placeholder="${window.AI_CONFIG?.chatbot?.placeholder || '메시지를 입력하세요...'}">
        <button class="ai-chatbot-send-btn" disabled>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    `;
    this.container = container;
    this.messagesContainer = container.querySelector('.ai-chatbot-messages');
    this.input = container.querySelector('.ai-chatbot-input');
    this.sendBtn = container.querySelector('.ai-chatbot-send-btn');
    this.clearBtn = container.querySelector('.ai-chatbot-clear-btn');
    this.closeBtn = container.querySelector('.ai-chatbot-close-btn');

    document.body.appendChild(fab);
    document.body.appendChild(container);

    this.renderMessages();
  }

  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    // FAB 클릭
    this.fab.addEventListener('click', () => this.toggle());

    // 닫기 버튼
    this.closeBtn.addEventListener('click', () => this.close());

    // 전송 버튼
    this.sendBtn.addEventListener('click', () => this.send());

    // 입력 필드
    this.input.addEventListener('input', () => {
      this.sendBtn.disabled = !this.input.value.trim() || this.isTyping;
    });

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && this.input.value.trim() && !this.isTyping) {
        e.preventDefault();
        this.send();
      }
    });

    // 대화 기록 삭제
    this.clearBtn.addEventListener('click', () => {
      if (confirm('대화 기록을 삭제하시겠습니까?')) {
        this.clearHistory();
      }
    });

    // ESC 키로 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // 외부 클릭으로 닫기 (선택적)
    document.addEventListener('click', (e) => {
      if (this.isOpen &&
        !this.container.contains(e.target) &&
        !this.fab.contains(e.target)) {
        // 외부 클릭 닫기는 비활성화 (사용자 경험 고려)
        // this.close();
      }
    });
  }

  /**
   * 챗봇 토글
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * 챗봇 열기
   */
  open() {
    this.isOpen = true;
    this.container.classList.add('open');
    this.fab.classList.add('open');
    setTimeout(() => this.input.focus(), 100);
  }

  /**
   * 챗봇 닫기
   */
  close() {
    this.isOpen = false;
    this.container.classList.remove('open');
    this.fab.classList.remove('open');
  }

  /**
   * 메시지 전송
   */
  async send() {
    const content = this.input.value.trim();
    if (!content || this.isTyping) return;

    // 사용자 메시지 추가
    this.messages.push({ role: 'user', content });
    this.input.value = '';
    this.sendBtn.disabled = true;
    this.renderMessages();
    this.saveHistory();

    // 타이핑 표시
    this.isTyping = true;
    this.showTyping();

    // AI 응답 생성
    let assistantMessage = { role: 'assistant', content: '' };
    this.messages.push(assistantMessage);

    if (window.aiClient) {
      await window.aiClient.sendMessage(
        this.messages.slice(0, -1), // 마지막 빈 어시스턴트 메시지 제외
        (chunk, fullContent) => {
          assistantMessage.content = fullContent;
          this.hideTyping();
          this.renderMessages();
        },
        (fullContent) => {
          this.isTyping = false;
          this.hideTyping();
          this.saveHistory();
          this.sendBtn.disabled = !this.input.value.trim();
        },
        (error) => {
          this.isTyping = false;
          this.hideTyping();
          assistantMessage.content = `⚠️ 오류가 발생했습니다: ${error}`;
          this.renderMessages();
          this.sendBtn.disabled = !this.input.value.trim();
        }
      );
    } else {
      this.isTyping = false;
      this.hideTyping();
      assistantMessage.content = '⚠️ AI 클라이언트가 초기화되지 않았습니다. 페이지를 새로고침해 주세요.';
      this.renderMessages();
    }
  }

  /**
   * 메시지 렌더링
   */
  renderMessages() {
    if (this.messages.length === 0) {
      this.messagesContainer.innerHTML = `
        <div class="ai-chatbot-welcome">
          <div class="ai-chatbot-welcome-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5 2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5 2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 0 2.5-2.5 2.5 2.5 0 0 0-2.5-2.5z"/>
            </svg>
          </div>
          <h3>안녕하세요! 👋</h3>
          <p>Documentation Hub AI 어시스턴트입니다.<br>문서에 대해 궁금한 점을 물어보세요.</p>
          <div class="ai-chatbot-suggestions">
            <button class="ai-chatbot-suggestion" data-query="Docker 설치 방법을 알려주세요">🐳 Docker 설치</button>
            <button class="ai-chatbot-suggestion" data-query="SSH 보안 설정은 어떻게 하나요?">🔐 SSH 보안</button>
            <button class="ai-chatbot-suggestion" data-query="Proxmox 클러스터 구성 방법">🖥️ Proxmox</button>
          </div>
        </div>
      `;

      // 추천 질문 클릭 이벤트
      this.messagesContainer.querySelectorAll('.ai-chatbot-suggestion').forEach(btn => {
        btn.addEventListener('click', () => {
          this.input.value = btn.dataset.query;
          this.sendBtn.disabled = false;
          this.input.focus();
        });
      });
      return;
    }

    this.messagesContainer.innerHTML = this.messages.map(msg => `
      <div class="ai-chatbot-message ${msg.role}">
        <div class="ai-chatbot-avatar">
          ${msg.role === 'user'
        ? '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5 2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5 2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 0 2.5-2.5 2.5 2.5 0 0 0-2.5-2.5z"/></svg>'
      }
        </div>
        <div class="ai-chatbot-bubble">${this.renderMarkdown(msg.content)}</div>
      </div>
    `).join('');

    // 스크롤 하단으로
    requestAnimationFrame(() => {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    });
  }

  /**
   * 마크다운 렌더링 (개선된 버전)
   */
  renderMarkdown(text) {
    if (!text) return '';

    // HTML 이스케이프
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 코드 블록 (먼저 처리)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
    });

    // 인라인 코드
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 헤딩
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // 볼드
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // 이탤릭
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // 링크
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // 수평선
    html = html.replace(/^---$/gm, '<hr>');

    // 리스트 아이템
    html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');

    // 연속된 li를 ul/ol로 감싸기
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
      return `<ul>${match}</ul>`;
    });

    // 줄바꿈 처리 (pre 태그 외부만)
    const parts = html.split(/(<pre>[\s\S]*?<\/pre>)/);
    html = parts.map((part, i) => {
      if (part.startsWith('<pre>')) return part;
      return part.replace(/\n/g, '<br>');
    }).join('');

    // 빈 p 태그 정리
    html = html.replace(/<br><br>/g, '</p><p>');
    html = html.replace(/^(?!<[hup]|<li|<pre|<hr)(.+)/gm, '<p>$1</p>');
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<[hup]|<li|<pre|<hr)/g, '$1');
    html = html.replace(/(<\/[hup]>|<\/li>|<\/pre>|<hr>)<\/p>/g, '$1');

    return html;
  }

  /**
   * 타이핑 인디케이터 표시
   */
  showTyping() {
    const typing = document.createElement('div');
    typing.className = 'ai-chatbot-message assistant ai-chatbot-typing-indicator';
    typing.innerHTML = `
      <div class="ai-chatbot-avatar">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5 2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5 2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 0 2.5-2.5 2.5 2.5 0 0 0-2.5-2.5z"/>
        </svg>
      </div>
      <div class="ai-chatbot-bubble">
        <div class="ai-chatbot-typing">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    this.messagesContainer.appendChild(typing);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  /**
   * 타이핑 인디케이터 숨김
   */
  hideTyping() {
    const typing = this.messagesContainer.querySelector('.ai-chatbot-typing-indicator');
    if (typing) typing.remove();
  }

  /**
   * 대화 기록 저장
   */
  saveHistory() {
    try {
      localStorage.setItem('ai-chatbot-history', JSON.stringify(this.messages.slice(-50)));
    } catch (e) {
      console.warn('Failed to save chat history:', e);
    }
  }

  /**
   * 대화 기록 불러오기
   */
  loadHistory() {
    try {
      const saved = localStorage.getItem('ai-chatbot-history');
      if (saved) {
        this.messages = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load chat history:', e);
      this.messages = [];
    }
  }

  /**
   * 대화 기록 삭제
   */
  clearHistory() {
    this.messages = [];
    localStorage.removeItem('ai-chatbot-history');
    this.renderMessages();
  }
}

// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', () => {
  if (window.AI_CONFIG) {
    window.aiChatbot = new AIChatbot();
  } else {
    console.warn('AI_CONFIG not found. AI Chatbot will not be initialized.');
  }
});
