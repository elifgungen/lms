/**
 * QTI 2.1 (Question and Test Interoperability) Service
 * Soru import/export için XML tabanlı standart
 */

const { XMLParser, XMLBuilder } = require('fast-xml-parser');

class QTIService {
    constructor() {
        this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_'
        });
        this.builder = new XMLBuilder({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            format: true
        });
    }

    /**
     * QTI XML'den soru parse et
     */
    parseQTIQuestion(xmlString) {
        try {
            const parsed = this.parser.parse(xmlString);
            const item = parsed.assessmentItem || parsed.item;

            if (!item) {
                throw new Error('Geçersiz QTI formatı: assessmentItem bulunamadı');
            }

            const question = {
                identifier: item['@_identifier'] || `q_${Date.now()}`,
                title: item['@_title'] || 'İsimsiz Soru',
                type: this.detectQuestionType(item),
                text: this.extractQuestionText(item),
                options: this.extractOptions(item),
                correctAnswer: this.extractCorrectAnswer(item),
                points: parseFloat(item['@_adaptive']) || 1.0
            };

            return { success: true, question };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Soru türünü tespit et
     */
    detectQuestionType(item) {
        const interaction = item.itemBody?.choiceInteraction ||
            item.itemBody?.textEntryInteraction ||
            item.itemBody?.extendedTextInteraction ||
            item.itemBody?.matchInteraction ||
            item.itemBody?.orderInteraction;

        if (item.itemBody?.choiceInteraction) {
            const maxChoices = item.itemBody.choiceInteraction['@_maxChoices'];
            return maxChoices === '1' ? 'multiple_choice' : 'multiple_select';
        }
        if (item.itemBody?.textEntryInteraction) return 'short_answer';
        if (item.itemBody?.extendedTextInteraction) return 'essay';
        if (item.itemBody?.matchInteraction) return 'matching';
        if (item.itemBody?.orderInteraction) return 'ordering';

        return 'multiple_choice'; // default
    }

    /**
     * Soru metnini çıkar
     */
    extractQuestionText(item) {
        const body = item.itemBody;
        if (!body) return '';

        // p veya div içindeki metni al
        if (body.p) return typeof body.p === 'string' ? body.p : body.p['#text'] || '';
        if (body.div) return typeof body.div === 'string' ? body.div : body.div['#text'] || '';

        // choiceInteraction içindeki prompt
        if (body.choiceInteraction?.prompt) {
            const prompt = body.choiceInteraction.prompt;
            return typeof prompt === 'string' ? prompt : prompt['#text'] || '';
        }

        return '';
    }

    /**
     * Seçenekleri çıkar
     */
    extractOptions(item) {
        const choices = item.itemBody?.choiceInteraction?.simpleChoice;
        if (!choices) return [];

        const choiceArray = Array.isArray(choices) ? choices : [choices];
        return choiceArray.map((choice, index) => ({
            id: choice['@_identifier'] || `opt_${index}`,
            text: typeof choice === 'string' ? choice : choice['#text'] || ''
        }));
    }

    /**
     * Doğru cevabı çıkar
     */
    extractCorrectAnswer(item) {
        const responseDeclaration = item.responseDeclaration;
        if (!responseDeclaration) return null;

        const correctResponse = responseDeclaration.correctResponse;
        if (!correctResponse) return null;

        const value = correctResponse.value;
        if (Array.isArray(value)) {
            return value.map(v => typeof v === 'string' ? v : v['#text']);
        }
        return typeof value === 'string' ? value : value['#text'];
    }

    /**
     * Soruyu QTI XML'e dönüştür
     */
    exportToQTI(question) {
        const qtiObject = {
            assessmentItem: {
                '@_xmlns': 'http://www.imsglobal.org/xsd/imsqti_v2p1',
                '@_identifier': question.id || `q_${Date.now()}`,
                '@_title': question.text?.substring(0, 50) || 'Soru',
                '@_adaptive': 'false',
                '@_timeDependent': 'false',

                responseDeclaration: {
                    '@_identifier': 'RESPONSE',
                    '@_cardinality': question.type === 'multiple_select' ? 'multiple' : 'single',
                    '@_baseType': 'identifier',
                    correctResponse: {
                        value: question.correctAnswer || ''
                    }
                },

                outcomeDeclaration: {
                    '@_identifier': 'SCORE',
                    '@_cardinality': 'single',
                    '@_baseType': 'float',
                    defaultValue: { value: '0' }
                },

                itemBody: this.buildItemBody(question),

                responseProcessing: {
                    '@_template': 'http://www.imsglobal.org/question/qti_v2p1/rptemplates/match_correct'
                }
            }
        };

        const xml = this.builder.build(qtiObject);
        return `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
    }

    /**
     * Soru gövdesini oluştur
     */
    buildItemBody(question) {
        const body = {};

        if (question.type === 'multiple_choice' || question.type === 'multiple_select') {
            body.choiceInteraction = {
                '@_responseIdentifier': 'RESPONSE',
                '@_shuffle': 'true',
                '@_maxChoices': question.type === 'multiple_choice' ? '1' : '0',
                prompt: question.text,
                simpleChoice: (question.options || []).map((opt, i) => ({
                    '@_identifier': opt.id || `opt_${i}`,
                    '#text': opt.text
                }))
            };
        } else if (question.type === 'short_answer') {
            body.p = question.text;
            body.textEntryInteraction = {
                '@_responseIdentifier': 'RESPONSE',
                '@_expectedLength': '50'
            };
        } else if (question.type === 'essay') {
            body.p = question.text;
            body.extendedTextInteraction = {
                '@_responseIdentifier': 'RESPONSE',
                '@_expectedLines': '10'
            };
        }

        return body;
    }

    /**
     * Çoklu soru import et
     */
    parseQTIPackage(xmlString) {
        try {
            const parsed = this.parser.parse(xmlString);

            // assessmentTest veya testPart içindeki itemler
            const items = parsed.assessmentTest?.testPart?.assessmentSection?.assessmentItemRef ||
                parsed.assessmentItem ? [parsed] : [];

            const questions = [];
            const itemArray = Array.isArray(items) ? items : [items];

            for (const item of itemArray) {
                const result = this.parseQTIQuestion(this.builder.build({ assessmentItem: item }));
                if (result.success) {
                    questions.push(result.question);
                }
            }

            return { success: true, questions, count: questions.length };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

module.exports = new QTIService();
