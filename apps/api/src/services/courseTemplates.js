/**
 * Course Templates Service
 * Hazır ders şablonları ve yapıları
 */

// Türkçe ve İngilizce hazır şablonlar
const courseTemplates = {
    // Boş şablon
    blank: {
        id: 'blank',
        name: 'Boş Ders',
        nameEn: 'Blank Course',
        description: 'Sıfırdan başlayın',
        descriptionEn: 'Start from scratch',
        modules: []
    },

    // Temel kurs yapısı
    basic: {
        id: 'basic',
        name: 'Temel Kurs',
        nameEn: 'Basic Course',
        description: 'Giriş, içerik ve değerlendirme modülleri',
        descriptionEn: 'Introduction, content and assessment modules',
        modules: [
            {
                title: 'Giriş',
                titleEn: 'Introduction',
                order: 1,
                contents: [
                    { title: 'Derse Hoş Geldiniz', titleEn: 'Welcome to the Course', type: 'text' },
                    { title: 'Ders Hedefleri', titleEn: 'Course Objectives', type: 'text' }
                ]
            },
            {
                title: 'Ders İçeriği',
                titleEn: 'Course Content',
                order: 2,
                contents: [
                    { title: 'Konu 1', titleEn: 'Topic 1', type: 'text' },
                    { title: 'Konu 2', titleEn: 'Topic 2', type: 'text' }
                ]
            },
            {
                title: 'Değerlendirme',
                titleEn: 'Assessment',
                order: 3,
                contents: [
                    { title: 'Final Sınavı', titleEn: 'Final Exam', type: 'exam' }
                ]
            }
        ]
    },

    // Haftalık program şablonu
    weekly: {
        id: 'weekly',
        name: 'Haftalık Program',
        nameEn: 'Weekly Schedule',
        description: '14 haftalık dönem yapısı',
        descriptionEn: '14-week semester structure',
        modules: Array.from({ length: 14 }, (_, i) => ({
            title: `Hafta ${i + 1}`,
            titleEn: `Week ${i + 1}`,
            order: i + 1,
            contents: [
                { title: `Hafta ${i + 1} - Ders Materyali`, titleEn: `Week ${i + 1} - Lecture Material`, type: 'text' },
                { title: `Hafta ${i + 1} - Okuma`, titleEn: `Week ${i + 1} - Reading`, type: 'pdf' }
            ]
        }))
    },

    // Video kursu şablonu
    videoCourse: {
        id: 'videoCourse',
        name: 'Video Kursu',
        nameEn: 'Video Course',
        description: 'Video tabanlı eğitim yapısı',
        descriptionEn: 'Video-based training structure',
        modules: [
            {
                title: 'Başlangıç',
                titleEn: 'Getting Started',
                order: 1,
                contents: [
                    { title: 'Tanıtım Videosu', titleEn: 'Introduction Video', type: 'video' },
                    { title: 'Kurulum Rehberi', titleEn: 'Setup Guide', type: 'pdf' }
                ]
            },
            {
                title: 'Temel Konular',
                titleEn: 'Core Topics',
                order: 2,
                contents: [
                    { title: 'Video 1: Temel Kavramlar', titleEn: 'Video 1: Basic Concepts', type: 'video' },
                    { title: 'Video 2: Uygulamalı Örnek', titleEn: 'Video 2: Practical Example', type: 'video' }
                ]
            },
            {
                title: 'İleri Konular',
                titleEn: 'Advanced Topics',
                order: 3,
                contents: [
                    { title: 'Video 3: İleri Teknikler', titleEn: 'Video 3: Advanced Techniques', type: 'video' },
                    { title: 'Video 4: En İyi Uygulamalar', titleEn: 'Video 4: Best Practices', type: 'video' }
                ]
            },
            {
                title: 'Sertifika',
                titleEn: 'Certification',
                order: 4,
                contents: [
                    { title: 'Final Sınavı', titleEn: 'Final Exam', type: 'exam' }
                ]
            }
        ]
    },

    // Workshop şablonu
    workshop: {
        id: 'workshop',
        name: 'Atölye Çalışması',
        nameEn: 'Workshop',
        description: 'Uygulamalı atölye yapısı',
        descriptionEn: 'Hands-on workshop structure',
        modules: [
            {
                title: 'Hazırlık',
                titleEn: 'Preparation',
                order: 1,
                contents: [
                    { title: 'Gereksinimler', titleEn: 'Requirements', type: 'text' },
                    { title: 'Kurulum', titleEn: 'Setup', type: 'pdf' }
                ]
            },
            {
                title: 'Uygulama 1',
                titleEn: 'Exercise 1',
                order: 2,
                contents: [
                    { title: 'Talimatlar', titleEn: 'Instructions', type: 'text' },
                    { title: 'Başlangıç Dosyaları', titleEn: 'Starter Files', type: 'file' }
                ]
            },
            {
                title: 'Uygulama 2',
                titleEn: 'Exercise 2',
                order: 3,
                contents: [
                    { title: 'Talimatlar', titleEn: 'Instructions', type: 'text' },
                    { title: 'Başlangıç Dosyaları', titleEn: 'Starter Files', type: 'file' }
                ]
            },
            {
                title: 'Proje',
                titleEn: 'Project',
                order: 4,
                contents: [
                    { title: 'LMS Demo', titleEn: 'LMS Demo', type: 'assignment' }
                ]
            }
        ]
    }
};

/**
 * Get all available templates
 * @param {string} locale - 'tr' or 'en'
 */
function getTemplates(locale = 'tr') {
    return Object.values(courseTemplates).map(template => ({
        id: template.id,
        name: locale === 'en' ? template.nameEn : template.name,
        description: locale === 'en' ? template.descriptionEn : template.description,
        moduleCount: template.modules.length
    }));
}

/**
 * Get a specific template by ID
 * @param {string} templateId
 * @param {string} locale - 'tr' or 'en'
 */
function getTemplate(templateId, locale = 'tr') {
    const template = courseTemplates[templateId];
    if (!template) return null;

    return {
        id: template.id,
        name: locale === 'en' ? template.nameEn : template.name,
        description: locale === 'en' ? template.descriptionEn : template.description,
        modules: template.modules.map(mod => ({
            title: locale === 'en' ? mod.titleEn : mod.title,
            order: mod.order,
            contents: mod.contents.map(c => ({
                title: locale === 'en' ? c.titleEn : c.title,
                type: c.type
            }))
        }))
    };
}

/**
 * Apply a template to create course structure
 * @param {Object} prisma - Prisma client
 * @param {string} courseId - Course ID to apply template to
 * @param {string} templateId - Template ID
 * @param {string} locale - 'tr' or 'en'
 */
async function applyTemplate(prisma, courseId, templateId, locale = 'tr') {
    const template = getTemplate(templateId, locale);
    if (!template) {
        throw new Error('Template not found');
    }

    const createdModules = [];

    for (const mod of template.modules) {
        const createdModule = await prisma.module.create({
            data: {
                courseId,
                title: mod.title,
                order: mod.order
            }
        });

        for (const content of mod.contents) {
            await prisma.content.create({
                data: {
                    moduleId: createdModule.id,
                    title: content.title,
                    type: content.type,
                    body: '',
                    metadata: {}
                }
            });
        }

        createdModules.push(createdModule);
    }

    return createdModules;
}

module.exports = {
    courseTemplates,
    getTemplates,
    getTemplate,
    applyTemplate
};
