(() => {
    const requiredColumns = [
        "id", "name", "location", "category", "skills", "rating", "reviewCount",
        "totalRevenue", "monthlyRevenue", "reelPrice", "promotionPrice", "storyPrice",
        "totalProjects", "completedProjects", "activeProjects", "socialLinks", "portfolio", "reviews"
    ];

    function parseCSV(text) {
        const rows = [];
        let row = [];
        let field = "";
        let quoted = false;

        for (let index = 0; index < text.length; index += 1) {
            const character = text[index];
            if (quoted) {
                if (character === '"' && text[index + 1] === '"') {
                    field += '"';
                    index += 1;
                } else if (character === '"') {
                    quoted = false;
                } else {
                    field += character;
                }
            } else if (character === '"' && field.length === 0) {
                quoted = true;
            } else if (character === '"') {
                throw new Error(`Unexpected quote at CSV character ${index + 1}.`);
            } else if (character === ",") {
                row.push(field);
                field = "";
            } else if (character === "\n" || character === "\r") {
                if (character === "\r" && text[index + 1] === "\n") index += 1;
                row.push(field);
                if (row.some(value => value.length > 0)) rows.push(row);
                row = [];
                field = "";
            } else {
                field += character;
            }
        }

        if (quoted) throw new Error("The CSV contains an unclosed quoted field.");
        if (field.length > 0 || row.length > 0) {
            row.push(field);
            if (row.some(value => value.length > 0)) rows.push(row);
        }
        if (rows.length < 2) throw new Error("The CSV must include a header and at least one creator.");

        const headers = rows[0].map(value => value.replace(/^\uFEFF/, "").trim());
        if (new Set(headers).size !== headers.length) throw new Error("The CSV contains duplicate column names.");
        const missingColumns = requiredColumns.filter(column => !headers.includes(column));
        if (missingColumns.length) throw new Error(`The CSV is missing required columns: ${missingColumns.join(", ")}.`);

        return rows.slice(1).map((values, rowIndex) => {
            if (values.length !== headers.length) {
                throw new Error(`CSV row ${rowIndex + 2} has ${values.length} fields; expected ${headers.length}.`);
            }
            return Object.fromEntries(headers.map((header, index) => [header, values[index].trim()]));
        });
    }

    function parseJSONCell(row, column, rowNumber) {
        try {
            return JSON.parse(row[column]);
        } catch (error) {
            throw new Error(`CSV row ${rowNumber}, "${column}" must contain valid JSON: ${error.message}`);
        }
    }

    function requiredText(row, column, rowNumber) {
        const value = row[column];
        if (!value) throw new Error(`CSV row ${rowNumber}: "${column}" cannot be empty.`);
        return value;
    }

    function integer(row, column, rowNumber) {
        const value = Number(row[column]);
        if (!Number.isSafeInteger(value) || value < 0) {
            throw new Error(`CSV row ${rowNumber}: "${column}" must be a non-negative integer.`);
        }
        return value;
    }

    function stringArray(value, column, rowNumber) {
        if (!Array.isArray(value) || value.length === 0 || value.some(item => typeof item !== "string" || !item.trim())) {
            throw new Error(`CSV row ${rowNumber}: "${column}" must be a non-empty JSON array of strings.`);
        }
        return value.map(item => item.trim());
    }

    function mapCreator(row, rowNumber) {
        const id = requiredText(row, "id", rowNumber);
        const name = requiredText(row, "name", rowNumber);
        const location = requiredText(row, "location", rowNumber);
        const category = requiredText(row, "category", rowNumber);
        const skills = stringArray(parseJSONCell(row, "skills", rowNumber), "skills", rowNumber);
        const socialLinks = parseJSONCell(row, "socialLinks", rowNumber);
        const portfolio = parseJSONCell(row, "portfolio", rowNumber);
        const reviews = parseJSONCell(row, "reviews", rowNumber);
        const rating = Number(row.rating);
        const reviewCount = integer(row, "reviewCount", rowNumber);
        const totalProjects = integer(row, "totalProjects", rowNumber);
        const completedProjects = integer(row, "completedProjects", rowNumber);
        const activeProjects = integer(row, "activeProjects", rowNumber);

        if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
            throw new Error(`CSV row ${rowNumber}: "rating" must be a number from 0 to 5.`);
        }
        if (totalProjects !== completedProjects + activeProjects) {
            throw new Error(`CSV row ${rowNumber}: totalProjects must equal completedProjects + activeProjects.`);
        }
        if (reviewCount < 1) throw new Error(`CSV row ${rowNumber}: "reviewCount" must be at least 1.`);

        const money = {
            total: integer(row, "totalRevenue", rowNumber),
            monthly: integer(row, "monthlyRevenue", rowNumber),
            reel: integer(row, "reelPrice", rowNumber),
            promotion: integer(row, "promotionPrice", rowNumber),
            story: integer(row, "storyPrice", rowNumber)
        };

        if (!Array.isArray(socialLinks) || socialLinks.some(link =>
            !link || typeof link.platform !== "string" || typeof link.handle !== "string" ||
            typeof link.url !== "string" || !/^https:\/\//i.test(link.url)
        )) {
            throw new Error(`CSV row ${rowNumber}: "socialLinks" must be a JSON array of HTTPS links.`);
        }
        if (!Array.isArray(portfolio) || portfolio.length === 0) {
            throw new Error(`CSV row ${rowNumber}: "portfolio" must be a non-empty JSON array.`);
        }
        if (portfolio.some(item =>
            !item || typeof item.title !== "string" || typeof item.client !== "string" ||
            !["Completed", "In progress"].includes(item.status) || typeof item.description !== "string" ||
            typeof item.format !== "string" || typeof item.placeholder !== "string" ||
            !/^[a-z0-9-]+$/.test(item.placeholder) || !Array.isArray(item.toolsUsed) ||
            item.toolsUsed.some(tool => typeof tool !== "string") ||
            typeof item.commercialUse !== "string" ||
            (item.thumbnail !== undefined && (typeof item.thumbnail !== "string" || !/^https:\/\//i.test(item.thumbnail)))
        )) {
            throw new Error(`CSV row ${rowNumber}: "portfolio" contains an invalid mock project.`);
        }
        if (!Array.isArray(reviews) || reviews.length < 2 || reviews.length > 3 ||
            reviews.some(review => !review || typeof review.author !== "string" ||
                typeof review.text !== "string" || !review.text.trim() ||
                !Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5)
        ) {
            throw new Error(`CSV row ${rowNumber}: "reviews" must contain 2–3 sample reviews with ratings from 1 to 5.`);
        }

        const portfolioItems = portfolio.map(item => ({
            ...item,
            mediaUrl: item.thumbnail || "",
            toolsUsed: [...item.toolsUsed]
        }));
        const aiTools = [...new Set(portfolioItems.flatMap(item => item.toolsUsed))];

        return {
            id,
            name,
            location,
            category,
            role: `${category} Creator`,
            specialization: `${category} · ${skills.slice(0, 2).join(", ")}`,
            bio: `Mock creator profile based in ${location}, specializing in ${skills.slice(0, 3).join(", ")} for sample brand campaigns.`,
            skills,
            rating,
            reviewCount,
            revenue: {
                total: money.total,
                thisMonth: money.monthly,
                completedCampaigns: money.total
            },
            pricing: {
                reel: money.reel,
                promotionalPost: money.promotion,
                storyPackage: money.story
            },
            projects: totalProjects,
            projectStats: {
                completed: completedProjects,
                inProgress: activeProjects
            },
            socialLinks,
            portfolioItems,
            reviews,
            aiTools,
            workflowSteps: ["Mock brief and creative direction", "Sample concept and production", "Review and delivery"],
            contentTypes: [...new Set(portfolioItems.map(item => item.format))],
            verification: { tools: false, workflow: false, pastWork: false },
            match: Math.round(rating * 20)
        };
    }

    window.loadNitiCreatorDataset = async function loadNitiCreatorDataset() {
        const response = await fetch("/data/creators.csv", { cache: "no-store" });
        if (!response.ok) throw new Error(`Could not load data/creators.csv (HTTP ${response.status}).`);

        const text = await response.text();
        const rows = parseCSV(text);
        const creators = rows.map((row, index) => mapCreator(row, index + 2));
        const ids = new Set();
        const names = new Set();

        creators.forEach(creator => {
            if (ids.has(creator.id)) throw new Error(`Duplicate creator id "${creator.id}" in the CSV.`);
            if (names.has(creator.name)) throw new Error(`Duplicate creator name "${creator.name}" in the CSV.`);
            ids.add(creator.id);
            names.add(creator.name);
        });

        return creators;
    };
})();
