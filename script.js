document.addEventListener("DOMContentLoaded", async () => {
    const postsListFile = "posts/list.txt"; // Файл со списком ссылок на статьи

    const postsPerPage = 1;
    let currentPage = 1;
    let allPosts = [];
    let filteredPosts = [];

    const blogContainer = document.getElementById("blog");
    const tocContainer = document.getElementById("toc");
    const prevButton = document.getElementById("prevPage");
    const nextButton = document.getElementById("nextPage");
    const pageNumber = document.getElementById("pageNumber");
    const searchInput = document.getElementById("searchInput");

    // Транслитерация для формирования URL
    function transliterate(text) {
        const ruToEn = {
            "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo", "ж": "zh", "з": "z",
            "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r",
            "с": "s", "т": "t", "у": "u", "ф": "f", "х": "h", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch",
            "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya"
        };
        return text.toLowerCase()
            .replace(/[а-яё]/g, char => ruToEn[char] || char)
            .replace(/[^a-z0-9-]/g, "-")
            .replace(/-+/g, "-")
            .trim("-");
    }

    // Загрузка списка файлов из list.txt
    async function loadPostList() {
        try {
            const response = await fetch(postsListFile);
            if (!response.ok) throw new Error("Ошибка загрузки списка статей");

            const text = await response.text();
            const postFiles = text.split("\n").map(line => line.trim()).filter(line => line !== "");

            await loadAllPosts(postFiles);
        } catch (error) {
            console.error(error);
        }
    }

    // Загрузка статей из файлов
    async function loadAllPosts(postFiles) {
        allPosts = [];
        for (const file of postFiles) {
            try {
                const response = await fetch(file);
                if (!response.ok) throw new Error(`Ошибка загрузки: ${file}`);
                const text = await response.text();

                const lines = text.split("\n");
                const title = lines[0].trim();
                const date = lines[1].trim();
                const audioSrc = lines[2].trim();
                const description = lines.slice(3).join("\n");

                allPosts.push({ title, date, audioSrc, description, file });
            } catch (error) {
                console.error("Ошибка загрузки:", error);
            }
        }
        filteredPosts = [...allPosts];
        generateTOC();
        checkURLForArticle();
        displayPosts();
    }

    // Генерация оглавления (TOC)
    function generateTOC() {
        tocContainer.innerHTML = "<ul>";
        filteredPosts.forEach((post, index) => {
            const postSlug = transliterate(post.title);
            tocContainer.innerHTML += `<li><a href="#" data-article="${index}" data-title="${postSlug}">${post.title}</a></li>`;
        });
        tocContainer.innerHTML += "</ul>";

        document.querySelectorAll("#toc a").forEach(link => {
            link.addEventListener("click", (event) => {
                event.preventDefault();
                const articleIndex = event.target.getAttribute("data-article");
                const articleTitle = event.target.getAttribute("data-title");
                history.pushState({}, "", `?article=${articleIndex}&title=${articleTitle}`);
                checkURLForArticle();
            });
        });
    }

    // Плавный скролл наверх страницы
    function scrollToTop() {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Отображение статей с аудио
    function displayPosts() {
        blogContainer.innerHTML = "";

        const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
        const startIndex = (currentPage - 1) * postsPerPage;
        const endIndex = startIndex + postsPerPage;
        const pagePosts = filteredPosts.slice(startIndex, endIndex);

        for (let i = 0; i < pagePosts.length; i++) {
            const post = pagePosts[i];
            const postSlug = transliterate(post.title);
            const articleURL = `${window.location.origin}${window.location.pathname}?article=${startIndex}&title=${postSlug}`;

            const article = document.createElement("div");
            article.classList.add("post");
            article.innerHTML = `
                <h2>${post.title}</h2>
                <p><small>${post.date}</small></p>
                <audio controls>
                    <source src="${post.audioSrc}" type="audio/mpeg">
                    Ваш браузер не поддерживает аудиоплеер.
                </audio>
                <p>${post.description.replace(/\n/g, "<br>")}</p>
                <p>
                    <button class="copy-link" data-link="${articleURL}">🔗 Скопировать ссылку</button>
                    <button class="share-link" data-title="${post.title}" data-description="${post.description}" data-url="${articleURL}">📤 Поделиться</button>
                </p>
                <hr>
            `;
            blogContainer.appendChild(article);
        }

        pageNumber.textContent = `Страница ${currentPage}`;
        prevButton.disabled = currentPage === 1;
        nextButton.disabled = currentPage >= totalPages;

        setupCopyAndShare();
        scrollToTop();
    }

    // Копирование и шаринг ссылок
    function setupCopyAndShare() {
        document.querySelectorAll(".copy-link").forEach(button => {
            button.addEventListener("click", (event) => {
                const url = event.target.getAttribute("data-link");
                navigator.clipboard.writeText(url).then(() => {
                    alert("Ссылка на статью скопирована!");
                }).catch(err => {
                    console.error("Ошибка при копировании ссылки", err);
                });
            });
        });

        document.querySelectorAll(".share-link").forEach(button => {
            button.addEventListener("click", (event) => {
                const title = event.target.getAttribute("data-title");
                const description = event.target.getAttribute("data-description");
                const pageUrl = event.target.getAttribute("data-url");
                const shareText = `🎧 ${title}\n\n${description}\n\n🔗 Слушать: ${pageUrl}`;

                if (navigator.share) {
                    navigator.share({
                        title: title,
                        text: shareText,
                        url: pageUrl
                    }).catch(err => console.error("Ошибка при отправке", err));
                } else {
                    navigator.clipboard.writeText(shareText).then(() => {
                        alert("Текст с ссылкой скопирован!");
                    });
                }
            });
        });
    }

    // Поиск по заголовкам и описанию
    function searchPosts() {
        const searchQuery = searchInput.value.toLowerCase();
        filteredPosts = allPosts.filter(post =>
            post.title.toLowerCase().includes(searchQuery) ||
            post.description.toLowerCase().includes(searchQuery)
        );
        currentPage = 1;
        generateTOC();
        displayPosts();
    }

    // Проверка URL на наличие параметров для прямой ссылки
    function checkURLForArticle() {
        const params = new URLSearchParams(window.location.search);
        if (params.has("article")) {
            const articleIndex = parseInt(params.get("article"));
            if (!isNaN(articleIndex) && articleIndex >= 0 && articleIndex < allPosts.length) {
                currentPage = articleIndex + 1;
                displayPosts();
                document.title = params.get("title").replace(/-/g, " ");
            }
        }
    }

    // Обработчики событий
    searchInput.addEventListener("input", searchPosts);
    prevButton.addEventListener("click", () => { if (currentPage > 1) { currentPage--; displayPosts(); } });
    nextButton.addEventListener("click", () => { if (currentPage < Math.ceil(filteredPosts.length / postsPerPage)) { currentPage++; displayPosts(); } });

    // Загружаем список и сами статьи
    await loadPostList();
});