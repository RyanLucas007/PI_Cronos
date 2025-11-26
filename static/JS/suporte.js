document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 suporte.js carregado');
    const sections = document.querySelectorAll('.view-section');
    const menuItems = document.querySelectorAll('.suporte-menu li[data-section]');
    const footerLinks = document.querySelectorAll('[data-section-link]');
    function showSection(name) {
        sections.forEach(sec => {
            sec.classList.toggle('active', sec.id === 'view-' + name);
        });
        menuItems.forEach(li => {
            li.classList.toggle('active', li.dataset.section === name);
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        console.log('📂 Seção ativa:', name);
    }
    menuItems.forEach(li => {
        li.addEventListener('click', () => {
            const sectionName = li.dataset.section;
            if (sectionName) showSection(sectionName);
        });
    });
    footerLinks.forEach(a => {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionName = a.getAttribute('data-section-link');
            if (sectionName) showSection(sectionName);
        });
    });
    const perfilBtn = document.getElementById('perfilBtn');
    const profileMenu = document.getElementById('profileMenu');
    if (perfilBtn && profileMenu) {
        perfilBtn.addEventListener('click', () => {
            profileMenu.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!profileMenu.contains(e.target) && !perfilBtn.contains(e.target)) {
                profileMenu.classList.remove('active');
            }
        });
    }
    const accordionButtons = document.querySelectorAll('.accordion-button');
    accordionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const li = btn.parentElement;
            li.classList.toggle('active');
        });
    });
    function carregarHistorico() {
        const lista = document.getElementById('listaChamados');
        if (!lista) return;

        const chamados = JSON.parse(localStorage.getItem('chamados') || '[]');

        if (chamados.length === 0) {
            lista.innerHTML = '<p>Nenhum chamado registrado ainda.</p>';
            return;
        }

        lista.innerHTML = '';
        chamados.forEach((chamado, index) => {
            const div = document.createElement('div');
            div.className = 'chamado-item';
            div.innerHTML = `
                <h3>Chamado #${index + 1}</h3>
                <p><strong>Nome:</strong> ${chamado.nome}</p>
                <p><strong>Email:</strong> ${chamado.email}</p>
                <p><strong>Categoria:</strong> ${chamado.categoria}</p>
                <p><strong>Descrição:</strong> ${chamado.descricao}</p>
                <p><em>Enviado em: ${chamado.data}</em></p>
            `;
            lista.appendChild(div);
        });
    }

    carregarHistorico();
    const formChamado = document.getElementById('chamadoForm');
    const feedbackLabel = document.getElementById('feedbackChamado');

    if (formChamado) {
        formChamado.addEventListener('submit', (e) => {
            e.preventDefault();

            const nome = document.getElementById('nome').value.trim();
            const email = document.getElementById('email').value.trim();
            const categoria = document.getElementById('categoria').value;
            const descricao = document.getElementById('descricao').value.trim();

            if (!nome || !email || !categoria || !descricao) {
                alert('Preencha todos os campos!');
                return;
            }

            const chamado = {
                nome,
                email,
                categoria,
                descricao,
                data: new Date().toLocaleString('pt-BR')
            };

            const chamados = JSON.parse(localStorage.getItem('chamados') || '[]');
            chamados.push(chamado);
            localStorage.setItem('chamados', JSON.stringify(chamados));

            formChamado.reset();
            carregarHistorico();

            if (feedbackLabel) {
                feedbackLabel.textContent = '✅ Chamado registrado com sucesso! Você pode ver em "Histórico de Chamados".';
                feedbackLabel.style.color = 'lightgreen';
            }

            console.log('🎫 Chamado salvo:', chamado);
        });
    }
    const searchInput = document.getElementById('searchInput');
    const helpArticles = document.querySelectorAll('#helpArticles .card');
    const faqDetails = document.querySelectorAll('#faqList details');

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const term = searchInput.value.toLowerCase();

            helpArticles.forEach(card => {
                const txt = card.textContent.toLowerCase();
                card.style.display = txt.includes(term) ? 'block' : 'none';
            });

            faqDetails.forEach(el => {
                const txt = el.textContent.toLowerCase();
                el.style.display = txt.includes(term) ? 'block' : 'none';
            });
        });
    }

    const chatToggle = document.getElementById('chatToggle');
    const chatInterface = document.getElementById('chatInterface');
    const closeChat = document.getElementById('closeChat');
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendMessage');
    const chatMessages = document.getElementById('chatMessages');
    const typingIndicator = document.getElementById('typingIndicator');

    let isChatOpen = false;
    let firstOpen = true;

    // --> Base de conhecimento
    const knowledgeBase = {
        senha: {
            keywords: ['senha', 'password', 'login', 'acessar', 'conta', 'esqueci senha', 'redefinir senha'],
            response: `🔐 **Redefinir Senha:**

1. Clique em "Esqueci minha senha" na tela de login
2. Digite seu email cadastrado
3. Verifique sua caixa de entrada
4. Siga o link para criar nova senha

Se não receber o e-mail, verifique a pasta de spam.`
        },
        conta: {
            keywords: ['criar conta', 'registrar', 'cadastro', 'nova conta', 'sign up'],
            response: `📝 **Criar Conta Cronos:**

• Acesse o site oficial
• Clique em "Criar Conta"
• Preencha email, nome de usuário e senha
• Confirme seu email
• Ative o 2FA (recomendado)`
        },
        pagamento: {
            keywords: ['pagamento', 'pagar', 'cartão', 'compra', 'boleto', 'pix', 'dinheiro'],
            response: `💳 **Formas de Pagamento:**

• Cartão de crédito
• Pix
• Boleto
• PayPal

Problemas de pagamento? Informe o erro exato ou print.`
        },
        reembolso: {
            keywords: ['reembolso', 'devolução', 'devolver', 'estorno'],
            response: `💰 **Política de Reembolso:**

• Até 14 dias após a compra
• Menos de 2h de jogo
• Solicite pelo histórico de compras

Casos especiais podem ser analisados individualmente.`
        },
        download: {
            keywords: ['download', 'baixar', 'instalar', 'instalação', 'launcher'],
            response: `⬇️ **Download e Instalação:**

1. Abra o launcher Cronos
2. Vá em "Biblioteca"
3. Clique em "Instalar" no jogo desejado
4. Aguarde o download

Se der erro, envie o código da mensagem.`
        },
        seguranca: {
            keywords: ['segurança', 'hackeado', 'conta invadida', '2fa', 'autenticação'],
            response: `🛡️ **Segurança da Conta:**

• Ative autenticação em dois fatores
• Não compartilhe sua senha
• Use senha forte e única

Se suspeitar de invasão, altere a senha imediatamente.`
        },
        ola: {
            keywords: ['oi', 'olá', 'hello', 'hey', 'eae', 'boa tarde', 'boa noite', 'bom dia'],
            response: `👋 Olá! Sou o assistente virtual da Cronos.

Posso ajudar com:
• Senha/conta
• Pagamentos
• Downloads
• Reembolsos
• Segurança

Me conta, qual é o problema?`
        }
    };

    function openChat() {
        if (!chatInterface || !chatToggle) return;
        chatInterface.style.display = 'flex';
        chatToggle.style.display = 'none';
        isChatOpen = true;

        if (firstOpen) {
            firstOpen = false;
            setTimeout(() => {
                addMessage(
                    `👋 **Bem-vindo ao Suporte Cronos!**

Posso responder dúvidas sobre:
• Login e senha
• Pagamentos e reembolsos
• Download e instalação
• Segurança da conta`,
                    'support'
                );
            }, 400);
        }

        setTimeout(() => {
            if (chatInput) chatInput.focus();
        }, 200);
    }

    function closeChatWindow() {
        if (!chatInterface || !chatToggle) return;
        chatInterface.style.display = 'none';
        chatToggle.style.display = 'block';
        isChatOpen = false;
    }

    if (chatToggle) chatToggle.addEventListener('click', openChat);
    if (closeChat) closeChat.addEventListener('click', closeChatWindow);

    // -->Envio de mensagem
    function sendUserMessage() {
        if (!chatInput || !chatMessages) return;
        const text = chatInput.value.trim();
        if (!text) return;

        addMessage(text, 'user');
        chatInput.value = '';
        processAndRespond(text);
    }

    if (sendButton) {
        sendButton.addEventListener('click', sendUserMessage);
    }

    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendUserMessage();
            }
        });
    }

    // --> Processar mensagem e responder
    function processAndRespond(userMessage) {
        const msg = userMessage.toLowerCase();
        let bestResponse = null;
        let bestScore = 0;

        for (const key in knowledgeBase) {
            const item = knowledgeBase[key];
            item.keywords.forEach(k => {
                if (msg.includes(k)) {
                    const score = k.length / msg.length;
                    if (score > bestScore) {
                        bestScore = score;
                        bestResponse = item.response;
                    }
                }
            });
        }

        const response = bestResponse || getGenericResponse();

        showTyping(true);
        const delay = 600 + Math.random() * 900;

        setTimeout(() => {
            showTyping(false);
            addMessage(response, 'support');
        }, delay);
    }

    function getGenericResponse() {
        const options = [
            'Entendi! Pode me dar mais detalhes do problema?',
            'Hmm, não tenho uma resposta exata pra isso ainda, mas me conta melhor o que está acontecendo.',
            'Posso te ajudar com conta, pagamentos, download/instalação, reembolso e segurança. Em qual dessas áreas está seu problema?',
            'Parece algo mais específico. Se puder, descreva passo a passo o que você fez até chegar no erro.'
        ];
        return options[Math.floor(Math.random() * options.length)];
    }

    // --> Adicionar mensagem no chat
    function addMessage(text, sender) {
        if (!chatMessages) return;

        const div = document.createElement('div');
        div.className = `message ${sender}-message`;

        const time = new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });

        div.innerHTML = `
            <div class="message-header">
                <strong>${sender === 'user' ? 'Você' : 'Suporte Cronos'}</strong>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-content">${formatMessage(text)}</div>
        `;

        chatMessages.appendChild(div);
        scrollChatToBottom();
    }

    function formatMessage(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    }

    function scrollChatToBottom() {
        if (!chatMessages) return;
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showTyping(isTyping) {
        if (!typingIndicator) return;
        typingIndicator.style.display = isTyping ? 'block' : 'none';
        if (isTyping) {
            typingIndicator.textContent = 'Suporte Cronos está digitando...';
            scrollChatToBottom();
        }
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isChatOpen) {
            closeChatWindow();
        }
    });

    console.log('✅ Área de suporte inicializada');
});

document.addEventListener('DOMContentLoaded', function () {
    const burgerBtn = document.getElementById('burgerBtn');
    const nav = document.getElementById('mainNav');

    if (burgerBtn && nav) {
        burgerBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            nav.classList.toggle('active');
        });

        document.addEventListener('click', function (e) {
            if (!nav.contains(e.target) &&
                !burgerBtn.contains(e.target) &&
                nav.classList.contains('active')) {
                nav.classList.remove('active');
            }
        });
    }
});