console.log("🚀 support_chat.js carregado");

document.addEventListener("DOMContentLoaded", () => {
    const chatToggle = document.getElementById("chatToggle");
    const chatInterface = document.getElementById("chatInterface");
    const closeChat = document.getElementById("closeChat");
    const chatInput = document.getElementById("chatInput");
    const sendButton = document.getElementById("sendMessage");
    const chatMessages = document.getElementById("chatMessages");
    const typingIndicator = document.getElementById("typingIndicator");
    const supportForm = document.getElementById("supportForm");
    const supportFormFeedback = document.getElementById("supportFormFeedback");

    const userData = window.CRONOS_USER || {};
    const userId = userData.id || null;
    const userName = userData.nick || userData.name || "Você";
    const userEmail = userData.email || "";

    let isChatOpen = false;
    let hasOpenedChatBefore = false;
    let currentTicketId = null;
    let typingTimeout = null;

    const knowledgeBase = {
        senha: {
            keywords: ["senha", "password", "login", "acesso", "esqueci minha senha", "redefinir senha"],
            response:
                "🔐 <strong>Redefinição de senha</strong><br><br>" +
                "1. Na tela de login clique em <strong>“Esqueci minha senha”</strong><br>" +
                "2. Informe o email cadastrado<br>" +
                "3. Verifique sua caixa de entrada (e spam)<br>" +
                "4. Siga o link para criar uma nova senha<br><br>" +
                "Use uma senha forte com letras, números e símbolos."
        },
        conta: {
            keywords: ["conta", "cadastro", "registrar", "criar conta"],
            response:
                "👤 <strong>Criar conta Cronos</strong><br><br>" +
                "• Acesse a tela de <strong>Cadastro</strong><br>" +
                "• Preencha email, nome de usuário e senha<br>" +
                "• Confirme seu email se solicitado<br>" +
                "• Depois é só fazer login e aproveitar os jogos."
        },
        pagamento: {
            keywords: ["pagamento", "pagar", "cartão", "pix", "boleto", "compra", "cartao"],
            response:
                "💳 <strong>Formas de pagamento</strong><br><br>" +
                "• Cartão de crédito (parcelado conforme suporte do gateway)<br>" +
                "• PIX (confirmação mais rápida)<br>" +
                "• Boleto (compensação em até 2 dias úteis)<br><br>" +
                "Se um pagamento falhar, verifique limite, saldo e se o banco liberou compras on-line."
        },
        reembolso: {
            keywords: ["reembolso", "estorno", "devolver", "reembolsar"],
            response:
                "💰 <strong>Reembolso</strong><br><br>" +
                "• O prazo padrão é de poucos dias após a compra (ver política da plataforma)<br>" +
                "• Jogos com muitas horas jogadas podem não ser elegíveis<br>" +
                "• Para solicitar, use a área de <strong>Biblioteca &gt; Reembolso</strong> (quando disponível) " +
                "ou abra um chamado explicando o caso."
        },
        download: {
            keywords: ["download", "baixar", "instalar", "instalação", "launcher"],
            response:
                "⬇️ <strong>Download e instalação</strong><br><br>" +
                "1. Certifique-se de ter espaço em disco suficiente<br>" +
                "2. Verifique se o antivírus não está bloqueando o jogo<br>" +
                "3. Execute o launcher/jogo como administrador se necessário<br>" +
                "4. Em caso de erro, copie a mensagem completa e envie num chamado."
        },
        conexao: {
            keywords: ["conexão", "lag", "ping", "servidor", "online", "internet"],
            response:
                "🌐 <strong>Problemas de conexão</strong><br><br>" +
                "• Teste sua conexão (speedtest)<br>" +
                "• Se estiver via Wi-Fi, teste por cabo se possível<br>" +
                "• Feche downloads/streamings em segundo plano<br>" +
                "• Verifique se não há manutenção no servidor do jogo."
        },
        ola: {
            keywords: ["oi", "olá", "hello", "hey", "bom dia", "boa tarde", "boa noite", "eae"],
            response:
                "👋 Olá! Eu sou o assistente de suporte da Cronos.<br>" +
                "Você pode me perguntar sobre <strong>senha</strong>, <strong>pagamentos</strong>, " +
                "<strong>download</strong>, <strong>reembolso</strong>, <strong>conexão</strong> e mais.<br><br>" +
                "Se preferir, também posso abrir um <strong>ticket</strong> para você pelo formulário."
        }
    };

    function openChat() {
        if (!chatInterface || !chatToggle) return;
        chatInterface.style.display = "flex";
        chatToggle.style.display = "none";
        isChatOpen = true;

        if (!hasOpenedChatBefore) {
            hasOpenedChatBefore = true;
            addSupportMessage(
                "Bem-vindo ao chat da <strong>Cronos</strong>! ✨<br>" +
                "Use frases como <strong>“problema com pagamento”</strong>, <strong>“não consigo baixar o jogo”</strong>, " +
                "<strong>“esqueci minha senha”</strong> para respostas rápidas.<br><br>" +
                "Se o problema for mais sério, recomendo abrir um chamado pelo formulário ao lado."
            );
        }

        ensureChatTicket();

        setTimeout(() => {
            if (chatInput) chatInput.focus();
        }, 150);
    }

    function closeChatWindow() {
        if (!chatInterface || !chatToggle) return;
        chatInterface.style.display = "none";
        chatToggle.style.display = "block";
        isChatOpen = false;
    }

    if (chatToggle) {
        chatToggle.addEventListener("click", openChat);
    }
    if (closeChat) {
        closeChat.addEventListener("click", closeChatWindow);
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && isChatOpen) {
            closeChatWindow();
        }
    });

    if (sendButton) {
        sendButton.addEventListener("click", sendUserMessage);
    }
    if (chatInput) {
        chatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendUserMessage();
            }
        });

        chatInput.addEventListener("input", () => {
            showTypingIndicator();
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(hideTypingIndicator, 900);
        });
    }

    function sendUserMessage() {
        if (!chatInput || !chatMessages) return;
        const text = chatInput.value.trim();
        if (!text) return;

        addUserMessage(text);
        chatInput.value = "";
        scrollToBottom();

        if (currentTicketId) {
            saveChatMessage(currentTicketId, text, false);
        }

        processAutoResponse(text);
    }

    function addUserMessage(text) {
        addMessage(text, "user");
    }

    function addSupportMessage(text) {
        addMessage(text, "support");
    }

    function addMessage(text, sender, createdAt) {
        if (!chatMessages) return;

        const msgDiv = document.createElement("div");
        msgDiv.className = `message ${sender === "user" ? "user-message" : "support-message"}`;

        const header = document.createElement("div");
        header.className = "message-header";

        const strong = document.createElement("strong");
        strong.textContent = sender === "user" ? "Você" : "Suporte Cronos";

        const timeSpan = document.createElement("span");
        timeSpan.className = "message-time";
        const date = createdAt ? new Date(createdAt) : new Date();
        timeSpan.textContent = date.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
        });

        header.appendChild(strong);
        header.appendChild(timeSpan);

        const content = document.createElement("div");
        content.className = "message-content";
        content.innerHTML = formatMessage(text);

        msgDiv.appendChild(header);
        msgDiv.appendChild(content);

        chatMessages.appendChild(msgDiv);
    }

    function formatMessage(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\n/g, "<br>");
    }

    function scrollToBottom() {
        if (!chatMessages) return;
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 50);
    }

    function showTypingIndicator() {
        if (!typingIndicator) return;
        typingIndicator.textContent = "Suporte Cronos está digitando...";
        typingIndicator.style.display = "block";
        scrollToBottom();
    }

    function hideTypingIndicator() {
        if (!typingIndicator) return;
        typingIndicator.style.display = "none";
    }

    function processAutoResponse(userText) {
        const lower = userText.toLowerCase();
        let bestResponse = null;
        let bestScore = 0;

        Object.values(knowledgeBase).forEach((entry) => {
            entry.keywords.forEach((kw) => {
                if (lower.includes(kw)) {
                    const score = kw.length / lower.length;
                    if (score > bestScore) {
                        bestScore = score;
                        bestResponse = entry.response;
                    }
                }
            });
        });

        let response;
        if (bestResponse) {
            response = bestResponse;
        } else {
            response =
                "Entendi! 😊<br>" +
                "Ainda não tenho uma resposta exata para isso, mas você pode detalhar mais ou abrir um chamado pelo formulário ao lado.<br><br>" +
                "Tente também usar palavras como <strong>senha</strong>, <strong>pagamento</strong>, " +
                "<strong>download</strong> ou <strong>reembolso</strong> para respostas rápidas.";
        }

        showTypingIndicator();
        setTimeout(() => {
            hideTypingIndicator();
            addSupportMessage(response);
            scrollToBottom();
        }, 600 + Math.random() * 900);
    }

    async function ensureChatTicket() {
        if (currentTicketId) {
            loadChatHistory();
            return;
        }

        try {
            const payload = {
                name: userName || "Usuário chat",
                email: userEmail || "sem-email@local",
                category: "chat",
                subject: "Suporte via chat - " + new Date().toLocaleString("pt-BR"),
                message: "Chat de suporte iniciado pelo widget na página de suporte."
            };

            const res = await fetch("/api/support", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                console.error("Erro ao criar ticket de chat:", res.status);
                return;
            }

            const ticket = await res.json();
            currentTicketId = ticket.id;
            console.log("🎫 Ticket de chat criado:", currentTicketId);

            addSupportMessage(
                `Criei o ticket <strong>#${currentTicketId}</strong> para registrar esta conversa. ` +
                `Se o problema persistir, um humano pode acompanhar por lá.`
            );

            await saveChatMessage(
                currentTicketId,
                "Chat de suporte iniciado automaticamente pelo widget.",
                true
            );

            loadChatHistory();
        } catch (err) {
            console.error("Erro ao criar ticket de chat:", err);
        }
    }

    async function loadChatHistory() {
        if (!currentTicketId || !chatMessages) return;

        try {
            const res = await fetch(`/api/tickets/${currentTicketId}/messages`);
            if (!res.ok) return;
            const msgs = await res.json();

            msgs.forEach((m) => {
                addMessage(
                    m.message,
                    m.is_support ? "support" : "user",
                    m.created_at
                );
            });

            scrollToBottom();
        } catch (err) {
            console.error("Erro ao carregar histórico do chat:", err);
        }
    }

    async function saveChatMessage(ticketId, text, isSupport) {
        try {
            await fetch(`/api/tickets/${ticketId}/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    userId: userId,
                    userName: userName,
                    message: text,
                    isSupport: !!isSupport
                })
            });
        } catch (err) {
            console.error("Erro ao salvar mensagem do chat:", err);
        }
    }

    if (supportForm) {
        supportForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            if (supportFormFeedback) {
                supportFormFeedback.style.display = "none";
                supportFormFeedback.textContent = "";
            }

            const formData = new FormData(supportForm);

            try {
                const res = await fetch("/api/support", {
                    method: "POST",
                    body: formData
                });

                const data = await res.json();

                if (!res.ok) {
                    console.error("Erro ao enviar ticket:", data);
                    showFormFeedback(
                        "❌ Erro ao enviar chamado. Verifique os campos e tente novamente.",
                        false
                    );
                    return;
                }

                showFormFeedback(
                    `✅ Chamado criado com sucesso! ID: #${data.id}`,
                    true
                );
                supportForm.reset();
            } catch (err) {
                console.error("Erro ao enviar ticket:", err);
                showFormFeedback(
                    "❌ Erro de conexão ao enviar chamado. Tente novamente.",
                    false
                );
            }
        });
    }

    function showFormFeedback(msg, ok) {
        if (!supportFormFeedback) return;
        supportFormFeedback.style.display = "block";
        supportFormFeedback.textContent = msg;
        supportFormFeedback.style.color = ok ? "#24c94b" : "#ff5555";
    }

    console.log("✅ Suporte (chat + formulário) inicializado");
});
