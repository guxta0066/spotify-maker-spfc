document.addEventListener("DOMContentLoaded", () => {
    const themeToggle = document.getElementById("theme-toggle");
    themeToggle.addEventListener("change", () => {
        document.documentElement.setAttribute("data-theme", themeToggle.checked ? "light" : "dark");
    });

    // Exemplo de ajuste de status
    const creationStatus = document.getElementById("creation-status");
    function showStatus(message, isError = false) {
        creationStatus.textContent = message;
        creationStatus.style.color = isError ? "red" : "green";
    }

    // Botão de criar playlist
    const createBtn = document.getElementById("create-playlist-btn");
    createBtn.addEventListener("click", async () => {
        showStatus("Criando playlist...");
        try {
            // chamada ao backend
            const response = await fetch("/api/create-playlist", { method: "POST" });
            if (!response.ok) throw new Error("Falha ao criar playlist");
            showStatus("Playlist criada com sucesso!");
        } catch (err) {
            showStatus("Erro ao criar playlist: " + err.message, true);
        }
    });
});
