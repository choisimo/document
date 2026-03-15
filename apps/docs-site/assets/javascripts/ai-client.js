/**
 * AI Client - OpenAI SDK 호환 API 클라이언트
 *
 * AI_CONFIG.apiBaseUrl 은 API 버전 경로까지 포함한 base 여야 합니다.
 * 예) https://ai.nodove.com/v1  (trailing slash 없이)
 *
 * 이 클라이언트는 apiBaseUrl 에 엔드포인트 경로만 이어 붙입니다:
 *   /chat/completions
 *   /models
 */

class AIClient {
    constructor(config = window.AI_CONFIG) {
        this.config = config;
        this.abortController = null;
    }

    /**
     * API 요청 헤더 생성
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (this.config.apiToken) {
            headers['Authorization'] = `Bearer ${this.config.apiToken}`;
        }

        return headers;
    }

    /**
     * Open Notebook 지식 베이스 검색
     * @param {string} query - 검색 질의
     * @returns {Promise<string|null>} - 포맷된 컨텍스트 문자열 또는 null
     */
    async queryKnowledgeBase(query) {
        const openNotebook = this.config?.openNotebook;
        if (!openNotebook?.enabled || !query) {
            return null;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
            const headers = {
                'Content-Type': 'application/json',
            };

            if (openNotebook.apiToken) {
                headers['Authorization'] = `Bearer ${openNotebook.apiToken}`;
            }

            const response = await fetch(`${openNotebook.apiUrl}/api/search`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    query,
                    limit: openNotebook.maxResults,
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`Open Notebook 오류: ${response.status}`);
            }

            const data = await response.json();
            const results = Array.isArray(data?.results) ? data.results : [];

            if (results.length === 0) {
                return null;
            }

            const formatted = results
                .map((item, index) => {
                    const title = item?.title ? `제목: ${item.title}` : null;
                    const content = item?.content || item?.text || '';
                    const source = item?.source || item?.url ? `출처: ${item.source || item.url}` : null;
                    return [`${index + 1}.`, title, content, source].filter(Boolean).join(' ');
                })
                .join('\n\n')
                .trim();

            if (!formatted) {
                return null;
            }

            return formatted.slice(0, openNotebook.contextMaxChars);
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('Open Notebook 검색 시간 초과');
                return null;
            }

            console.warn('Open Notebook 검색 실패:', error);
            return null;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * 채팅 메시지 전송 (스트리밍)
     * @param {Array} messages - 대화 메시지 배열
     * @param {Function} onChunk - 청크 수신 시 콜백
     * @param {Function} onComplete - 완료 시 콜백
     * @param {Function} onError - 에러 시 콜백
     */
    async sendMessage(messages, onChunk, onComplete, onError) {
        // 이전 요청 취소
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();

        const systemMessage = {
            role: 'system',
            content: this.config.chatbot.systemPrompt
        };

        const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
        const knowledgeBaseContext = await this.queryKnowledgeBase(lastUserMessage?.content || '');
        const knowledgeBaseMessage = knowledgeBaseContext ? {
            role: 'system',
            content: `[Open Notebook 지식 베이스 검색 결과]\n${knowledgeBaseContext}\n[지식 베이스 검색 결과 끝]\n\n위 지식 베이스 검색 결과를 최우선으로 참고하여 답변해주세요.`
        } : null;

        const requestBody = {
            messages: knowledgeBaseMessage
                ? [systemMessage, knowledgeBaseMessage, ...messages]
                : [systemMessage, ...messages],
            stream: true,
        };

        // 모델명이 설정되어 있으면 추가 (없으면 백엔드 기본 모델 사용)
        if (this.config.modelName) {
            requestBody.model = this.config.modelName;
        }

        try {
            const response = await fetch(`${this.config.apiBaseUrl}/chat/completions`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(requestBody),
                signal: this.abortController.signal,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `API 오류: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let fullContent = '';

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    onComplete(fullContent);
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();

                        if (data === '[DONE]') {
                            onComplete(fullContent);
                            return;
                        }

                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content || '';

                            if (content) {
                                fullContent += content;
                                onChunk(content, fullContent);
                            }
                        } catch (e) {
                            // JSON 파싱 실패 무시 (불완전한 청크일 수 있음)
                        }
                    }
                }
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                return; // 사용자가 취소한 경우
            }

            console.error('AI Client Error:', error);
            onError(error.message || '알 수 없는 오류가 발생했습니다.');
        }
    }

    /**
     * 진행 중인 요청 취소
     */
    abort() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }

    /**
     * API 연결 상태 확인
     */
    async checkConnection() {
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/models`, {
                method: 'GET',
                headers: this.getHeaders(),
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}

// 전역 인스턴스 생성
window.aiClient = new AIClient();
