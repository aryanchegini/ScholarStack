import express from 'express';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

const router = express.Router();

router.get('/papers', async (req, res, next) => {
    try {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const formattedQuery = encodeURIComponent(String(query).trim());
        const url = `http://export.arxiv.org/api/query?search_query=all:${formattedQuery}&start=0&max_results=10&sortBy=relevance&sortOrder=descending`;

        console.log(`Searching arXiv for: ${formattedQuery}`);

        const response = await axios.get(url);

        const result = await parseStringPromise(response.data, {
            explicitArray: false,
            ignoreAttrs: true,
        });

        const feed = result.feed;
        if (!feed || !feed.entry) {
            return res.json([]);
        }

        const entries = Array.isArray(feed.entry) ? feed.entry : [feed.entry];

        const papers = entries.map((entry: any) => {
            let authors = [];
            if (entry.author) {
                if (Array.isArray(entry.author)) {
                    authors = entry.author.map((a: any) => a.name);
                } else {
                    authors = [entry.author.name];
                }
            }

            let pdfUrl = '';
            if (entry.link) {
                if (Array.isArray(entry.link)) {
                    const pdfLink = entry.link.find((l: any) => l.title === 'pdf' || l.type === 'application/pdf');
                    pdfUrl = pdfLink ? pdfLink.href : '';
                } else if (entry.link.title === 'pdf' || entry.link.type === 'application/pdf') {
                    pdfUrl = entry.link.href;
                }
            }

            if (!pdfUrl && entry.id) {
                pdfUrl = entry.id.replace('abs', 'pdf') + '.pdf';
            }

            return {
                id: entry.id,
                title: entry.title.replace(/\n\s*/g, ' ').trim(),
                authors: authors,
                summary: entry.summary.replace(/\n\s*/g, ' ').trim(),
                publishedDate: entry.published,
                updatedDate: entry.updated,
                url: entry.id,
                pdfUrl: pdfUrl,
                source: 'arXiv'
            };
        });

        res.json(papers);
    } catch (error) {
        console.error('Error fetching papers from arXiv:', error);
        next(error);
    }
});

export default router;
