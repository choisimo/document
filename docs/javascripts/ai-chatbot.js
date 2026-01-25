/**
 * AI Chatbot UI Component
 * 
 * 플로팅 챗봇 인터페이스
 * - 드래그 & 리사이즈 지원
 * - 마크다운 렌더링
 * - 대화 기록 저장 (localStorage)
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
      }

      .ai-chatbot-fab:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 28px rgba(102, 126, 234, 0.5);
      }

      .ai-chatbot-fab svg {
        width: 28px;
        height: 28px;
        fill: white;
      }

      .ai-chatbot-fab.active {
        transform: rotate(45deg);
      }

      .ai-chatbot-container {
        position: fixed;
        bottom: 100px;
        right: 24px;
        width: 380px;
        max-width: calc(100vw - 48px);
        height: 520px;
        max-height: calc(100vh - 140px);
        background: var(--md-default-bg-color, #fff);
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        display: none;
        flex-direction: column;
        overflow: hidden;
        z-index: 9999;
        border: 1px solid var(--md-default-fg-color--lightest, #eee);
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

      .ai-chatbot-header {
        padding: 16px 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .ai-chatbot-header-icon {
        width: 36px;
        height: 36px;
        background: rgba(255,255,255,0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .ai-chatbot-header-icon svg {
        width: 20px;
        height: 20px;
        fill: white;
      }

      .ai-chatbot-header-text {
        flex: 1;
      }

      .ai-chatbot-header-title {
        font-weight: 600;
        font-size: 16px;
        margin: 0;
      }

      .ai-chatbot-header-subtitle {
        font-size: 12px;
        opacity: 0.8;
        margin: 0;
      }

      .ai-chatbot-clear-btn {
        background: rgba(255,255,255,0.2);
        border: none;
        border-radius: 8px;
        padding: 8px;
        cursor: pointer;
        transition: background 0.2s;
      }

      .ai-chatbot-clear-btn:hover {
        background: rgba(255,255,255,0.3);
      }

      .ai-chatbot-clear-btn svg {
        width: 16px;
        height: 16px;
        fill: white;
      }

      .ai-chatbot-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .ai-chatbot-message {
        display: flex;
        gap: 8px;
        max-width: 90%;
      }

      .ai-chatbot-message.user {
        align-self: flex-end;
        flex-direction: row-reverse;
      }

      .ai-chatbot-message.assistant {
        align-self: flex-start;
      }

      .ai-chatbot-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .ai-chatbot-message.user .ai-chatbot-avatar {
        background: var(--md-primary-fg-color, #4051b5);
      }

      .ai-chatbot-message.assistant .ai-chatbot-avatar {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }

      .ai-chatbot-avatar svg {
        width: 16px;
        height: 16px;
        fill: white;
      }

      .ai-chatbot-bubble {
        padding: 12px 16px;
        border-radius: 16px;
        font-size: 14px;
        line-height: 1.5;
      }

      .ai-chatbot-message.user .ai-chatbot-bubble {
        background: var(--md-primary-fg-color, #4051b5);
        color: white;
        border-bottom-right-radius: 4px;
      }

      .ai-chatbot-message.assistant .ai-chatbot-bubble {
        background: var(--md-default-fg-color--lightest, #f5f5f5);
        color: var(--md-default-fg-color, #333);
        border-bottom-left-radius: 4px;
      }

      .ai-chatbot-bubble p {
        margin: 0 0 8px 0;
      }

      .ai-chatbot-bubble p:last-child {
        margin-bottom: 0;
      }

      .ai-chatbot-bubble pre {
        background: var(--md-code-bg-color, #f5f5f5);
        padding: 12px;
        border-radius: 8px;
        overflow-x: auto;
        margin: 8px 0;
      }

      .ai-chatbot-bubble code {
        font-family: var(--md-code-font, monospace);
        font-size: 13px;
      }

      .ai-chatbot-bubble ul, .ai-chatbot-bubble ol {
        margin: 8px 0;
        padding-left: 20px;
      }

      .ai-chatbot-typing {
        display: flex;
        gap: 4px;
        padding: 8px 12px;
      }

      .ai-chatbot-typing span {
        width: 8px;
        height: 8px;
        background: var(--md-default-fg-color--light, #999);
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
        0%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-6px); }
      }

      .ai-chatbot-input-area {
        padding: 16px;
        border-top: 1px solid var(--md-default-fg-color--lightest, #eee);
        display: flex;
        gap: 12px;
      }

      .ai-chatbot-input {
        flex: 1;
        padding: 12px 16px;
        border: 1px solid var(--md-default-fg-color--lightest, #ddd);
        border-radius: 24px;
        font-size: 14px;
        outline: none;
        background: var(--md-default-bg-color, #fff);
        color: var(--md-default-fg-color, #333);
        transition: border-color 0.2s;
      }

      .ai-chatbot-input:focus {
        border-color: var(--md-primary-fg-color, #4051b5);
      }

      .ai-chatbot-input::placeholder {
        color: var(--md-default-fg-color--light, #999);
      }

      .ai-chatbot-send-btn {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s, opacity 0.2s;
      }

      .ai-chatbot-send-btn:hover:not(:disabled) {
        transform: scale(1.05);
      }

      .ai-chatbot-send-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .ai-chatbot-send-btn svg {
        width: 20px;
        height: 20px;
        fill: white;
      }

      .ai-chatbot-welcome {
        text-align: center;
        padding: 24px;
        color: var(--md-default-fg-color--light, #666);
      }

      .ai-chatbot-welcome-icon {
        width: 64px;
        height: 64px;
        margin: 0 auto 16px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .ai-chatbot-welcome-icon svg {
        width: 32px;
        height: 32px;
        fill: white;
      }

      .ai-chatbot-welcome h3 {
        margin: 0 0 8px 0;
        color: var(--md-default-fg-color, #333);
        font-size: 18px;
      }

      .ai-chatbot-welcome p {
        margin: 0;
        font-size: 14px;
      }

      .ai-chatbot-suggestions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 16px;
        justify-content: center;
      }

      .ai-chatbot-suggestion {
        padding: 8px 16px;
        background: var(--md-default-fg-color--lightest, #f5f5f5);
        border: none;
        border-radius: 16px;
        font-size: 13px;
        cursor: pointer;
        transition: background 0.2s;
        color: var(--md-default-fg-color, #333);
      }

      .ai-chatbot-suggestion:hover {
        background: var(--md-primary-fg-color--light, #e3e7fd);
      }

      @media (max-width: 480px) {
        .ai-chatbot-container {
          width: calc(100vw - 16px);
          right: 8px;
          bottom: 80px;
          height: calc(100vh - 100px);
        }

        .ai-chatbot-fab {
          width: 52px;
          height: 52px;
          bottom: 16px;
          right: 16px;
        }
      }

      [data-md-color-scheme="slate"] .ai-chatbot-container {
        background: var(--md-default-bg-color);
        border-color: var(--md-default-fg-color--lightest);
      }

      [data-md-color-scheme="slate"] .ai-chatbot-message.assistant .ai-chatbot-bubble {
        background: var(--md-code-bg-color);
      }
    `;
        document.head.appendChild(styles);
    }

    /**
     * UI 요소 생성
     */
    createUI() {
        // FAB 버튼
        const fab = document.createElement('button');
        fab.className = 'ai-chatbot-fab';
        fab.setAttribute('aria-label', 'AI 챗봇 열기');
        fab.innerHTML = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98.97 4.29L2 22l5.71-.97C9.02 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm2.07-7.75l-.9.92C11.45 10.9 11 11.5 11 13h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H6c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
      </svg>
    `;
        this.fab = fab;

        // 챗봇 컨테이너
        const container = document.createElement('div');
        container.className = 'ai-chatbot-container';
        container.innerHTML = `
      <div class="ai-chatbot-header">
        <div class="ai-chatbot-header-icon">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
        </div>
        <div class="ai-chatbot-header-text">
          <p class="ai-chatbot-header-title">AI 어시스턴트</p>
          <p class="ai-chatbot-header-subtitle">문서에 대해 물어보세요</p>
        </div>
        <button class="ai-chatbot-clear-btn" title="대화 기록 삭제">
          <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </button>
      </div>
      <div class="ai-chatbot-messages"></div>
      <div class="ai-chatbot-input-area">
        <input type="text" class="ai-chatbot-input" placeholder="${window.AI_CONFIG?.chatbot?.placeholder || '메시지를 입력하세요...'}">
        <button class="ai-chatbot-send-btn" disabled>
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    `;
        this.container = container;
        this.messagesContainer = container.querySelector('.ai-chatbot-messages');
        this.input = container.querySelector('.ai-chatbot-input');
        this.sendBtn = container.querySelector('.ai-chatbot-send-btn');
        this.clearBtn = container.querySelector('.ai-chatbot-clear-btn');

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
        this.fab.classList.add('active');
        this.fab.innerHTML = `
      <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
    `;
        setTimeout(() => this.input.focus(), 100);
    }

    /**
     * 챗봇 닫기
     */
    close() {
        this.isOpen = false;
        this.container.classList.remove('open');
        this.fab.classList.remove('active');
        this.fab.innerHTML = `
      <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98.97 4.29L2 22l5.71-.97C9.02 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm2.07-7.75l-.9.92C11.45 10.9 11 11.5 11 13h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H6c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
    `;
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
                    assistantMessage.content = `오류가 발생했습니다: ${error}`;
                    this.renderMessages();
                    this.sendBtn.disabled = !this.input.value.trim();
                }
            );
        } else {
            this.isTyping = false;
            this.hideTyping();
            assistantMessage.content = 'AI 클라이언트가 초기화되지 않았습니다. 페이지를 새로고침해 주세요.';
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
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
          </div>
          <h3>안녕하세요!</h3>
          <p>Documentation Hub AI 어시스턴트입니다.<br>문서에 대해 궁금한 점을 물어보세요.</p>
          <div class="ai-chatbot-suggestions">
            <button class="ai-chatbot-suggestion" data-query="Docker 설치 방법을 알려주세요">Docker 설치</button>
            <button class="ai-chatbot-suggestion" data-query="SSH 보안 설정은 어떻게 하나요?">SSH 보안</button>
            <button class="ai-chatbot-suggestion" data-query="Proxmox 클러스터 구성 방법">Proxmox</button>
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
                ? '<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'
                : '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>'
            }
        </div>
        <div class="ai-chatbot-bubble">${this.renderMarkdown(msg.content)}</div>
      </div>
    `).join('');

        // 스크롤 하단으로
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    /**
     * 간단한 마크다운 렌더링
     */
    renderMarkdown(text) {
        if (!text) return '';

        return text
            // 코드 블록
            .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
            // 인라인 코드
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // 볼드
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            // 이탤릭
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            // 링크
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
            // 리스트
            .replace(/^- (.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            // 줄바꿈
            .replace(/\n/g, '<br>')
            // 문단
            .replace(/(<br>){2,}/g, '</p><p>')
            .replace(/^(.+)$/s, '<p>$1</p>');
    }

    /**
     * 타이핑 인디케이터 표시
     */
    showTyping() {
        const typing = document.createElement('div');
        typing.className = 'ai-chatbot-message assistant ai-chatbot-typing-indicator';
        typing.innerHTML = `
      <div class="ai-chatbot-avatar">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
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
            localStorage.setItem('ai-chatbot-history', JSON.stringify(this.messages.slice(-50))); // 최근 50개만 저장
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
    // AI_CONFIG가 로드되었는지 확인
    if (window.AI_CONFIG) {
        window.aiChatbot = new AIChatbot();
    } else {
        console.warn('AI_CONFIG not found. AI Chatbot will not be initialized.');
    }
});
