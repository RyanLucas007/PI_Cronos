console.log("🛠 support_admin.js carregado");

document.addEventListener("DOMContentLoaded", () => {
    const listEl = document.getElementById("supportList");
    if (!listEl) return;

    async function loadTickets() {
        listEl.innerHTML = "<p>Carregando tickets...</p>";
        try {
            const res = await fetch("/api/support");
            if (!res.ok) {
                listEl.innerHTML = "<p>Erro ao carregar tickets.</p>";
                return;
            }
            const tickets = await res.json();
            if (!tickets.length) {
                listEl.innerHTML = "<p>Nenhum ticket encontrado.</p>";
                return;
            }

            listEl.innerHTML = "";
            tickets.forEach((t) => {
                const card = document.createElement("div");
                card.className = "support-ticket-card";

                const header = document.createElement("div");
                header.className = "support-ticket-header";

                const title = document.createElement("div");
                title.className = "support-ticket-title";
                title.textContent = `#${t.id} • ${t.subject || "(sem assunto)"}`;

                const meta = document.createElement("div");
                meta.className = "support-ticket-meta";

                const statusSpan = document.createElement("span");
                statusSpan.className =
                    "badge-status " +
                    (t.status === "resolved" ? "badge-resolved" : "badge-open");
                statusSpan.textContent =
                    t.status === "resolved" ? "Resolvido" : "Aberto";

                const dateSpan = document.createElement("span");
                const dt = t.created_at ? new Date(t.created_at) : null;
                dateSpan.textContent = dt
                    ? dt.toLocaleString("pt-BR")
                    : "(sem data)";
                dateSpan.style.marginLeft = "8px";

                meta.appendChild(statusSpan);
                meta.appendChild(dateSpan);

                header.appendChild(title);
                header.appendChild(meta);

                const info = document.createElement("div");
                info.className = "support-ticket-meta";
                info.innerHTML =
                    `<strong>${t.name}</strong> &lt;${t.email}&gt;` +
                    (t.category ? ` • ${t.category}` : "");

                const msg = document.createElement("div");
                msg.className = "support-ticket-message";
                const fullMsg = t.message || "";
                msg.textContent =
                    fullMsg.length > 220 ? fullMsg.slice(0, 220) + "..." : fullMsg;

                const actions = document.createElement("div");
                actions.className = "support-ticket-actions";

                if (t.attachment) {
                    const a = document.createElement("a");
                    a.href = "/" + t.attachment;
                    a.target = "_blank";
                    a.textContent = "Ver anexo";
                    a.style.fontSize = "0.78rem";
                    a.style.textDecoration = "underline";
                    actions.appendChild(a);
                }

                if (t.status !== "resolved") {
                    const btn = document.createElement("button");
                    btn.className = "btn-resolve";
                    btn.textContent = "Marcar resolvido";
                    btn.addEventListener("click", () => resolveTicket(t.id));
                    actions.appendChild(btn);
                }

                card.appendChild(header);
                card.appendChild(info);
                card.appendChild(msg);
                card.appendChild(actions);

                listEl.appendChild(card);
            });
        } catch (err) {
            console.error(err);
            listEl.innerHTML = "<p>Erro ao carregar tickets.</p>";
        }
    }

    async function resolveTicket(id) {
        if (!confirm(`Marcar ticket #${id} como resolvido?`)) return;
        try {
            const res = await fetch(`/api/support/${id}/resolve`, {
                method: "PATCH"
            });
            if (!res.ok) {
                alert("Erro ao marcar como resolvido.");
                return;
            }
            loadTickets();
        } catch (err) {
            console.error(err);
            alert("Erro ao marcar como resolvido.");
        }
    }

    loadTickets();
});
