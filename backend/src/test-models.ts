import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const project = await prisma.project.findFirst({
        include: { user: true }
    });

    const apiKey = project.user?.apiKey;

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await res.json();
        if (data.error) {
            console.error("Error from API:", data.error);
        } else {
            data.models.forEach((m: any) => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
                    console.log(m.name);
                }
            });
        }
    } catch (err) {
        console.error(err);
    }
}

main().finally(() => prisma.$disconnect());
