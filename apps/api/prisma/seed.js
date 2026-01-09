const bcrypt = require("bcrypt");
const prisma = require("../src/db");
const { ROLE_NAMES } = require("../src/utils/roles");
const crypto = require("crypto");

// Public, streamable demo assets for mobile/web playback
const SAMPLE_VIDEOS = [
  "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"
];

const SAMPLE_PDFS = [
  "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  "https://www.africau.edu/images/default/sample.pdf",
  "https://www.orimi.com/pdf-test.pdf"
];

async function ensureRoles() {
  for (const name of ROLE_NAMES) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }
}

async function createUser(email, password, name, roleName) {
  // Check if user exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists, skipping...`);
    return existing;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, name }
  });
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (role) {
    await prisma.userRole.create({
      data: { userId: user.id, roleId: role.id }
    });
  }
  return user;
}

async function main() {
  await ensureRoles();

  // Create users for all roles
  const admin = await createUser(
    "admin@example.com",
    "Password123!",
    "Admin User",
    "admin"
  );
  const instructor = await createUser(
    "instructor@example.com",
    "Password123!",
    "Instructor User",
    "instructor"
  );
  const student = await createUser(
    "student@example.com",
    "Password123!",
    "Student User",
    "student"
  );
  const guest = await createUser(
    "guest@example.com",
    "Password123!",
    "Guest User",
    "guest"
  );
  const assistant = await createUser(
    "assistant@example.com",
    "Password123!",
    "Assistant User",
    "assistant"
  );

  // ============ COURSES ============

  // AI/ML Course
  let aiCourse = await prisma.course.findFirst({ where: { title: "Yapay Zeka ve Makine Öğrenmesi" } });
  if (!aiCourse) {
    aiCourse = await prisma.course.create({
      data: {
        title: "Yapay Zeka ve Makine Öğrenmesi",
        description: "Yapay zeka ve makine öğrenmesinin temellerinden ileri seviye derin öğrenme tekniklerine kapsamlı bir eğitim. Neural network'ler, CNN, RNN, Transformer modelleri ve üretken yapay zeka konularını içerir.",
        createdById: instructor.id
      }
    });
    console.log("Created AI/ML Course");
  }

  // Data Engineering Course
  let dataEngCourse = await prisma.course.findFirst({ where: { title: "Veri Mühendisliği Temelleri" } });
  if (!dataEngCourse) {
    dataEngCourse = await prisma.course.create({
      data: {
        title: "Veri Mühendisliği Temelleri",
        description: "Modern veri pipeline'ları, ETL süreçleri, veri gölleri, data warehouse tasarımı ve büyük veri işleme teknolojileri. Apache Spark, Kafka ve Airflow kullanımı.",
        createdById: instructor.id
      }
    });
    console.log("Created Data Engineering Course");
  }

  // Demo Course (keep existing)
  let course = await prisma.course.findFirst({ where: { title: "Demo Course" } });
  if (!course) {
    course = await prisma.course.create({
      data: {
        title: "Demo Course",
        description: "Seeded course for demo flows",
        createdById: admin.id
      }
    });
  }

  // Enroll student in all courses
  for (const c of [course, aiCourse, dataEngCourse]) {
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: { userId: student.id, courseId: c.id }
    });
    if (!existingEnrollment) {
      await prisma.enrollment.create({
        data: {
          userId: student.id,
          courseId: c.id,
          role: "student",
          status: "active"
        }
      });
    }
  }

  // ============ COURSE MODULES AND CONTENT ============

  // AI/ML Course Modules
  const aiModuleCount = await prisma.module.count({ where: { courseId: aiCourse.id } });
  if (aiModuleCount === 0) {
    // Module 1: Introduction to AI
    const aiModule1 = await prisma.module.create({
      data: {
        courseId: aiCourse.id,
        title: "Yapay Zekaya Giriş",
        order: 1
      }
    });
    await prisma.content.createMany({
      data: [
        {
          moduleId: aiModule1.id,
          title: "AI Tarihçesi ve Temel Kavramlar",
          type: "video",
          body: "Bu video yapay zekanın tarihçesini ve temel kavramlarını açıklamaktadır.",
          metadata: { url: SAMPLE_VIDEOS[0], duration: "09:56" }
        },
        {
          moduleId: aiModule1.id,
          title: "Machine Learning Nedir?",
          type: "pdf",
          body: "Makine öğrenmesinin temellerini anlatan doküman.",
          metadata: { url: SAMPLE_PDFS[0], pages: 12 }
        }
      ]
    });

    // Module 2: Neural Networks
    const aiModule2 = await prisma.module.create({
      data: {
        courseId: aiCourse.id,
        title: "Yapay Sinir Ağları",
        order: 2
      }
    });
    await prisma.content.createMany({
      data: [
        {
          moduleId: aiModule2.id,
          title: "Neural Network Temelleri (3Blue1Brown)",
          type: "video",
          body: "Yapay sinir ağlarının matematiksel temelleri.",
          metadata: { url: SAMPLE_VIDEOS[2], duration: "14:48" }
        },
        {
          moduleId: aiModule2.id,
          title: "Gradient Descent Algoritması",
          type: "video",
          body: "Gradient descent optimizasyon algoritması detaylı anlatım.",
          metadata: { url: SAMPLE_VIDEOS[3], duration: "10:19" }
        },
        {
          moduleId: aiModule2.id,
          title: "Backpropagation Açıklaması",
          type: "pdf",
          body: "Geriye yayılım algoritmasının matematiksel temelleri.",
          metadata: { url: SAMPLE_PDFS[1], pages: 18 }
        }
      ]
    });

    // Module 3: Deep Learning
    const aiModule3 = await prisma.module.create({
      data: {
        courseId: aiCourse.id,
        title: "Derin Öğrenme ve CNN",
        order: 3
      }
    });
    await prisma.content.createMany({
      data: [
        {
          moduleId: aiModule3.id,
          title: "Convolutional Neural Networks",
          type: "video",
          body: "CNN mimarisinin detaylı anlatımı.",
          metadata: { url: SAMPLE_VIDEOS[1], duration: "10:53" }
        },
        {
          moduleId: aiModule3.id,
          title: "Transfer Learning ve Pre-trained Models",
          type: "pdf",
          body: "Transfer öğrenme teknikleri ve önceden eğitilmiş modellerin kullanımı.",
          metadata: { url: SAMPLE_PDFS[2], pages: 15 }
        }
      ]
    });

    console.log("Created 3 modules with 7 contents for AI/ML Course");
  }

  // Data Engineering Course Modules
  const dataEngModuleCount = await prisma.module.count({ where: { courseId: dataEngCourse.id } });
  if (dataEngModuleCount === 0) {
    // Module 1: Data Pipeline Basics
    const deModule1 = await prisma.module.create({
      data: {
        courseId: dataEngCourse.id,
        title: "Veri Pipeline Temelleri",
        order: 1
      }
    });
    await prisma.content.createMany({
      data: [
        {
          moduleId: deModule1.id,
          title: "ETL vs ELT: Farklar ve Kullanım Alanları",
          type: "video",
          body: "ETL ve ELT süreçlerinin karşılaştırılması.",
          metadata: { url: SAMPLE_VIDEOS[4], duration: "12:30" }
        },
        {
          moduleId: deModule1.id,
          title: "Data Pipeline Tasarım Prensipleri",
          type: "pdf",
          body: "Modern veri pipeline'ları için en iyi uygulamalar.",
          metadata: { url: SAMPLE_PDFS[0], pages: 18 }
        }
      ]
    });

    // Module 2: Apache Spark
    const deModule2 = await prisma.module.create({
      data: {
        courseId: dataEngCourse.id,
        title: "Apache Spark ile Büyük Veri İşleme",
        order: 2
      }
    });
    await prisma.content.createMany({
      data: [
        {
          moduleId: deModule2.id,
          title: "Spark Temel Kavramlar",
          type: "video",
          body: "Apache Spark'a giriş ve temel kavramlar.",
          metadata: { url: SAMPLE_VIDEOS[0], duration: "25:00" }
        },
        {
          moduleId: deModule2.id,
          title: "PySpark DataFrame İşlemleri",
          type: "pdf",
          body: "PySpark ile veri manipülasyonu rehberi.",
          metadata: { url: SAMPLE_PDFS[1], pages: 8 }
        }
      ]
    });

    // Module 3: Data Warehousing
    const deModule3 = await prisma.module.create({
      data: {
        courseId: dataEngCourse.id,
        title: "Data Warehouse Tasarımı",
        order: 3
      }
    });
    await prisma.content.createMany({
      data: [
        {
          moduleId: deModule3.id,
          title: "Star Schema ve Snowflake Schema",
          type: "video",
          body: "Dimensional modeling ve schema tasarımı.",
          metadata: { url: SAMPLE_VIDEOS[2], duration: "18:45" }
        },
        {
          moduleId: deModule3.id,
          title: "Data Vault 2.0 Metodolojisi",
          type: "pdf",
          body: "Modern data vault yaklaşımı ve uygulamaları.",
          metadata: { url: SAMPLE_PDFS[2], pages: 15 }
        }
      ]
    });

    console.log("Created 3 modules with 6 contents for Data Engineering Course");
  }

  // Demo Course Modules (Web Development)
  const demoModuleCount = await prisma.module.count({ where: { courseId: course.id } });
  if (demoModuleCount === 0) {
    const demoModule1 = await prisma.module.create({
      data: {
        courseId: course.id,
        title: "Web Geliştirme Temelleri",
        order: 1
      }
    });
    await prisma.content.createMany({
      data: [
        {
          moduleId: demoModule1.id,
          title: "HTML ve CSS Giriş",
          type: "video",
          body: "Web geliştirmenin temelleri: HTML ve CSS.",
          metadata: { url: SAMPLE_VIDEOS[3], duration: "16:00" }
        },
        {
          moduleId: demoModule1.id,
          title: "JavaScript Temelleri",
          type: "pdf",
          body: "JavaScript programlama dili giriş rehberi.",
          metadata: { url: SAMPLE_PDFS[0], pages: 30 }
        }
      ]
    });

    const demoModule2 = await prisma.module.create({
      data: {
        courseId: course.id,
        title: "React.js Framework",
        order: 2
      }
    });
    await prisma.content.createMany({
      data: [
        {
          moduleId: demoModule2.id,
          title: "React Giriş",
          type: "video",
          body: "React framework'üne giriş ve temel kavramlar.",
          metadata: { url: SAMPLE_VIDEOS[4], duration: "18:00" }
        },
        {
          moduleId: demoModule2.id,
          title: "React Hooks Rehberi",
          type: "pdf",
          body: "Modern React ile hooks kullanımı.",
          metadata: { url: SAMPLE_PDFS[1], pages: 20 }
        }
      ]
    });

    console.log("Created 2 modules with 4 contents for Demo Course");
  }

  // ============ AI/ML QUESTION BANK ============

  let aiQuestionBank = await prisma.questionBank.findFirst({
    where: { name: "Yapay Zeka Soru Bankası", courseId: aiCourse.id }
  });
  if (!aiQuestionBank) {
    aiQuestionBank = await prisma.questionBank.create({
      data: {
        name: "Yapay Zeka Soru Bankası",
        courseId: aiCourse.id,
        createdById: instructor.id
      }
    });
  }

  // AI/ML Questions
  const aiQuestionCount = await prisma.question.count({ where: { questionBankId: aiQuestionBank.id } });
  if (aiQuestionCount < 10) {
    await prisma.question.deleteMany({ where: { questionBankId: aiQuestionBank.id } });

    const aiQuestions = [
      {
        prompt: "Derin öğrenmede 'Gradient Descent' algoritmasının amacı nedir?",
        type: "multiple_choice_single",
        options: { items: ["Veriyi normalize etmek", "Kayıp fonksiyonunu minimize etmek", "Modeli görselleştirmek", "Veri setini bölmek"] },
        answer: { value: "Kayıp fonksiyonunu minimize etmek" }
      },
      {
        prompt: "Convolutional Neural Network (CNN) özellikle hangi tür veriler için uygundur?",
        type: "multiple_choice_single",
        options: { items: ["Zaman serisi verileri", "Görsel veriler", "Metin verileri", "Ses verileri"] },
        answer: { value: "Görsel veriler" }
      },
      {
        prompt: "Transformer mimarisi hangi mekanizmayı kullanarak sekans verilerini işler?",
        type: "multiple_choice_single",
        options: { items: ["Convolution", "Self-attention", "Pooling", "Recursion"] },
        answer: { value: "Self-attention" }
      },
      {
        prompt: "Overfitting, modelin eğitim verisi üzerinde aşırı iyi performans göstermesi durumudur.",
        type: "true_false",
        options: null,
        answer: { value: "true" }
      },
      {
        prompt: "GPT modelleri generative pre-trained transformer'ın kısaltmasıdır.",
        type: "true_false",
        options: null,
        answer: { value: "true" }
      },
      {
        prompt: "Hangi aktivasyon fonksiyonu, vanishing gradient problemini azaltmak için tercih edilir?",
        type: "multiple_choice_single",
        options: { items: ["Sigmoid", "Tanh", "ReLU", "Softmax"] },
        answer: { value: "ReLU" }
      },
      {
        prompt: "LSTM (Long Short-Term Memory) hangi tip neural network'ün bir varyasyonudur?",
        type: "multiple_choice_single",
        options: { items: ["CNN", "RNN", "GAN", "Autoencoder"] },
        answer: { value: "RNN" }
      },
      {
        prompt: "Batch normalization sadece eğitim sırasında kullanılır.",
        type: "true_false",
        options: null,
        answer: { value: "false" }
      },
      {
        prompt: "Dropout tekniği modelin hangi sorunuyla mücadele eder?",
        type: "short_text",
        options: null,
        answer: { value: "Overfitting" }
      },
      {
        prompt: "Transfer learning'in temel avantajı nedir?",
        type: "multiple_choice_single",
        options: { items: ["Daha az veri ile iyi sonuçlar", "Daha hızlı inference", "Daha küçük model boyutu", "Daha az bellek kullanımı"] },
        answer: { value: "Daha az veri ile iyi sonuçlar" }
      }
    ];

    for (const q of aiQuestions) {
      await prisma.question.create({
        data: { ...q, questionBankId: aiQuestionBank.id, difficulty: 'medium', points: 10 }
      });
    }
    console.log("Created 10 AI/ML questions");
  }

  // ============ DATA ENGINEERING QUESTION BANK ============

  let dataEngQuestionBank = await prisma.questionBank.findFirst({
    where: { name: "Veri Mühendisliği Soru Bankası", courseId: dataEngCourse.id }
  });
  if (!dataEngQuestionBank) {
    dataEngQuestionBank = await prisma.questionBank.create({
      data: {
        name: "Veri Mühendisliği Soru Bankası",
        courseId: dataEngCourse.id,
        createdById: instructor.id
      }
    });
  }

  const dataEngQuestionCount = await prisma.question.count({ where: { questionBankId: dataEngQuestionBank.id } });
  if (dataEngQuestionCount < 8) {
    await prisma.question.deleteMany({ where: { questionBankId: dataEngQuestionBank.id } });

    const dataEngQuestions = [
      {
        prompt: "ETL sürecinde 'T' neyi ifade eder?",
        type: "multiple_choice_single",
        options: { items: ["Transfer", "Transform", "Transpose", "Track"] },
        answer: { value: "Transform" }
      },
      {
        prompt: "Apache Kafka hangi amaçla kullanılır?",
        type: "multiple_choice_single",
        options: { items: ["Veri depolama", "Mesaj kuyruğu ve streaming", "Makine öğrenmesi", "Veri görselleştirme"] },
        answer: { value: "Mesaj kuyruğu ve streaming" }
      },
      {
        prompt: "Data Lake yapılandırılmamış veriyi de saklayabilir.",
        type: "true_false",
        options: null,
        answer: { value: "true" }
      },
      {
        prompt: "Apache Airflow hangi tür işlemler için tasarlanmıştır?",
        type: "multiple_choice_single",
        options: { items: ["Real-time streaming", "Workflow orchestration", "Database management", "File storage"] },
        answer: { value: "Workflow orchestration" }
      },
      // FILL IN BLANK question type
      {
        prompt: "ETL'nin açılımı Extract, _______, Load'dur.",
        type: "fill_blank",
        options: null,
        answer: { value: "Transform" }
      },
      // MATCHING question type
      {
        prompt: "Veri mühendisliği araçlarını eşleştirin:",
        type: "matching",
        options: { items: ["Apache Spark", "Apache Kafka", "Airflow", "Büyük veri işleme", "Mesaj streaming", "Workflow orchestration"] },
        answer: { value: "A-4, B-5, C-6" }
      },
      // ORDERING question type
      {
        prompt: "ETL pipeline adımlarını doğru sıraya koyun:",
        type: "ordering",
        options: { items: ["Veriyi dönüştür (Transform)", "Ham veriyi çek (Extract)", "Hedef veritabanına yükle (Load)", "Veri kalitesini kontrol et"] },
        answer: { value: "2, 1, 4, 3" }
      },
      {
        prompt: "Parquet dosya formatının temel avantajı nedir?",
        type: "short_text",
        options: null,
        answer: { value: "Columnar storage" }
      },
      {
        prompt: "OLAP sistemleri genellikle analitik sorgular için optimize edilmiştir.",
        type: "true_false",
        options: null,
        answer: { value: "true" }
      },
      {
        prompt: "Apache Spark hangi programlama dillerini destekler?",
        type: "multiple_choice_single",
        options: { items: ["Sadece Java", "Python, Scala, Java, R", "Sadece Python", "C++ ve Rust"] },
        answer: { value: "Python, Scala, Java, R" }
      },
      {
        prompt: "Data Warehouse tasarımında 'Star Schema' neyi içerir?",
        type: "multiple_choice_single",
        options: { items: ["Sadece fact tabloları", "Fact ve dimension tabloları", "Sadece dimension tabloları", "Temporary tablolar"] },
        answer: { value: "Fact ve dimension tabloları" }
      }
    ];

    for (const q of dataEngQuestions) {
      await prisma.question.create({
        data: { ...q, questionBankId: dataEngQuestionBank.id, difficulty: 'hard', points: 15 }
      });
    }
    console.log("Created 11 Data Engineering questions (including fill_blank, matching, ordering)");
  }

  // ============ DEFAULT QUESTION BANK (keep existing) ============

  let questionBank = await prisma.questionBank.findFirst({
    where: { name: "Default Question Bank", courseId: course.id }
  });
  if (!questionBank) {
    questionBank = await prisma.questionBank.create({
      data: {
        name: "Default Question Bank",
        courseId: course.id,
        createdById: instructor.id
      }
    });
  }

  const existingQuestions = await prisma.question.findMany({
    where: { questionBankId: questionBank.id }
  });

  if (existingQuestions.length < 5) {
    await prisma.question.deleteMany({ where: { questionBankId: questionBank.id } });

    await prisma.question.create({
      data: {
        prompt: "What is Next.js?",
        type: "multiple_choice_single",
        options: { items: ["A CSS framework", "A React framework", "A database", "An operating system"] },
        answer: { value: "A React framework" },
        questionBankId: questionBank.id
      }
    });

    await prisma.question.create({
      data: {
        prompt: "Is JavaScript a compiled language?",
        type: "true_false",
        options: null,
        answer: { value: "false" },
        questionBankId: questionBank.id
      }
    });

    await prisma.question.create({
      data: {
        prompt: "Which company created React?",
        type: "multiple_choice_single",
        options: { items: ["Google", "Facebook (Meta)", "Microsoft", "Apple"] },
        answer: { value: "Facebook (Meta)" },
        questionBankId: questionBank.id
      }
    });

    await prisma.question.create({
      data: {
        prompt: "TypeScript is a superset of JavaScript.",
        type: "true_false",
        options: null,
        answer: { value: "true" },
        questionBankId: questionBank.id
      }
    });

    await prisma.question.create({
      data: {
        prompt: "What does CSS stand for?",
        type: "short_text",
        options: null,
        answer: { value: "Cascading Style Sheets" },
        questionBankId: questionBank.id
      }
    });

    console.log("Created 5 questions in Default Question Bank");
  }

  // ============ EXAMS ============

  // Regular Demo Exam
  let exam = await prisma.exam.findFirst({ where: { title: "Demo Exam" } });
  if (!exam) {
    exam = await prisma.exam.create({
      data: {
        title: "Demo Exam",
        description: "A demo exam covering web development basics",
        durationMinutes: 45,
        courseId: course.id,
        createdById: instructor.id,
        sebEnabled: false
      }
    });
  }
  await prisma.exam.update({
    where: { id: exam.id },
    data: { questionBanks: { set: [{ id: questionBank.id }] } }
  });

  // SEB-enabled AI/ML Exam with Random Question Selection
  let aiExam = await prisma.exam.findFirst({ where: { title: "Yapay Zeka Final Sınavı (SEB)" } });
  if (!aiExam) {
    const sebBrowserKey = crypto.createHash("sha256").update("ai-exam-seb-key").digest("hex").substring(0, 32);
    aiExam = await prisma.exam.create({
      data: {
        title: "Yapay Zeka Final Sınavı (SEB)",
        description: "Bu sınav Safe Exam Browser gerektirir. 10 sorudan rastgele 5 tanesi sorulacaktır. Derin öğrenme, neural network'ler ve modern AI teknikleri hakkında kapsamlı sorular içerir.",
        durationMinutes: 90,
        randomQuestionCount: 5, // Havuzdaki 10 sorudan rastgele 5 soru seçilecek
        courseId: aiCourse.id,
        createdById: instructor.id,
        sebEnabled: true,
        sebBrowserKey: sebBrowserKey,
        sebConfig: {
          allowedUrls: ["http://localhost:3000/*"],
          blockedUrls: ["*google.com*", "*chatgpt.com*", "*openai.com*"]
        }
      }
    });
    console.log("Created SEB-enabled AI/ML Exam with randomQuestionCount=5");
  } else {
    // Update existing exam with randomQuestionCount
    await prisma.exam.update({
      where: { id: aiExam.id },
      data: { randomQuestionCount: 5 }
    });
  }
  await prisma.exam.update({
    where: { id: aiExam.id },
    data: { questionBanks: { set: [{ id: aiQuestionBank.id }] } }
  });

  // Regular Data Engineering Exam with Access Control (startAt/endAt)
  let dataEngExam = await prisma.exam.findFirst({ where: { title: "Veri Mühendisliği Ara Sınav" } });
  // Calculate demo dates: start = now, end = 30 days later
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  if (!dataEngExam) {
    dataEngExam = await prisma.exam.create({
      data: {
        title: "Veri Mühendisliği Ara Sınav",
        description: "ETL süreçleri, veri pipeline'ları ve büyük veri teknolojileri konularını kapsayan ara sınav. Bu sınav erişim kontrolüne sahiptir.",
        durationMinutes: 60,
        startAt: now,           // Sınav şu anda başlamış
        endAt: thirtyDaysLater, // 30 gün sonra bitecek
        courseId: dataEngCourse.id,
        createdById: instructor.id,
        sebEnabled: false
      }
    });
    console.log("Created Data Engineering Exam with startAt/endAt access control");
  } else {
    // Update existing exam with startAt/endAt
    await prisma.exam.update({
      where: { id: dataEngExam.id },
      data: { startAt: now, endAt: thirtyDaysLater }
    });
  }
  await prisma.exam.update({
    where: { id: dataEngExam.id },
    data: { questionBanks: { set: [{ id: dataEngQuestionBank.id }] } }
  });

  // Legacy SEB exam (keep for backwards compatibility)
  let sebExam = await prisma.exam.findFirst({ where: { title: "Secure Proctored Exam" } });
  if (!sebExam) {
    const sebBrowserKey = crypto.createHash("sha256").update("seb-demo-key").digest("hex").substring(0, 32);
    sebExam = await prisma.exam.create({
      data: {
        title: "Secure Proctored Exam",
        description: "This exam requires Safe Exam Browser for secure proctoring",
        durationMinutes: 60,
        courseId: course.id,
        createdById: instructor.id,
        sebEnabled: true,
        sebBrowserKey: sebBrowserKey,
        sebConfig: {
          allowedUrls: ["http://localhost:3000/*"],
          blockedUrls: ["*google.com*", "*facebook.com*"]
        }
      }
    });
  }
  await prisma.exam.update({
    where: { id: sebExam.id },
    data: { questionBanks: { set: [{ id: questionBank.id }] } }
  });

  // ============ ADD ANSWER KEYS FOR OMR ============

  // Demo Exam - 5 questions (Web Development)
  // Q1: What is Next.js? -> B (A React framework)
  // Q2: Is JavaScript compiled? -> FALSE (Not OMR multiple choice)
  // Q3: Who created React? -> B (Facebook)
  // Q4: TypeScript superset? -> TRUE (Not OMR multiple choice)
  // Q5: What is CSS? -> Short text (Not OMR)
  await prisma.exam.update({
    where: { id: exam.id },
    data: {
      answerKey: {
        "1": "B", "2": "B", "3": "B", "4": "A", "5": "A"
      }
    }
  });

  // AI/ML Exam - 10 questions
  // Q1: Gradient Descent -> B (Kayıp fonksiyonunu minimize etmek)
  // Q2: CNN -> B (Görsel veriler)
  // Q3: Transformer -> B (Self-attention)
  // Q4: Overfitting -> A (True)
  // Q5: GPT -> A (True)
  // Q6: ReLU -> C (ReLU)
  // Q7: LSTM -> B (RNN)
  // Q8: Batch norm -> B (False)
  // Q9: Dropout -> Short text
  // Q10: Transfer learning -> A (Daha az veri)
  await prisma.exam.update({
    where: { id: aiExam.id },
    data: {
      answerKey: {
        "1": "B", "2": "B", "3": "B", "4": "A", "5": "A",
        "6": "C", "7": "B", "8": "B", "9": "A", "10": "A"
      }
    }
  });

  // Data Engineering Exam - 11 questions
  // Q1: ETL 'T' -> B (Transform)
  // Q2: Kafka -> B (Mesaj kuyruğu)
  // Q3: Data Lake -> A (True)
  // Q4: Airflow -> B (Workflow orchestration)
  // Q5: ETL Fill -> N/A
  // Q6: Matching -> N/A
  // Q7: Ordering -> N/A
  // Q8: Parquet -> Short text
  // Q9: OLAP -> A (True)
  // Q10: Spark languages -> B (Python, Scala, Java, R)
  // Q11: Star Schema -> B (Fact ve dimension)
  await prisma.exam.update({
    where: { id: dataEngExam.id },
    data: {
      answerKey: {
        "1": "B", "2": "B", "3": "A", "4": "B", "5": "A",
        "6": "A", "7": "A", "8": "A", "9": "A", "10": "B", "11": "B"
      }
    }
  });

  // Secure Proctored Exam - same as Demo Exam (uses same question bank)
  await prisma.exam.update({
    where: { id: sebExam.id },
    data: {
      answerKey: {
        "1": "B", "2": "B", "3": "B", "4": "A", "5": "A"
      }
    }
  });

  console.log("Added answer keys to all 4 exams for OMR grading");

  // ============ ASSIGNMENTS ============

  // Demo Assignment (keep existing)
  let assignment = await prisma.assignment.findFirst({ where: { title: "Demo Assignment" } });
  if (!assignment) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    assignment = await prisma.assignment.create({
      data: {
        title: "Demo Assignment",
        description: "Submit a PDF report on web development best practices. Include sections on:\n1. Code organization\n2. Performance optimization\n3. Accessibility\n4. Security considerations",
        courseId: course.id,
        createdById: instructor.id,
        dueDate: dueDate,
        allowedFileTypes: "pdf,docx",
        maxFileSizeMb: 10
      }
    });
    console.log("Created Demo Assignment");
  }

  // AI/ML Assignment
  let aiAssignment = await prisma.assignment.findFirst({ where: { title: "Yapay Zeka Proje Ödevi" } });
  if (!aiAssignment) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);
    aiAssignment = await prisma.assignment.create({
      data: {
        title: "Yapay Zeka Proje Ödevi",
        description: "Bir makine öğrenmesi modeli geliştirin ve sonuçlarınızı raporlayın.\n\nGereksinimler:\n1. Veri seti analizi ve ön işleme\n2. En az 2 farklı model karşılaştırması\n3. Confusion matrix ve accuracy sonuçları\n4. Jupyter notebook ve PDF rapor teslimi\n\nKullanılabilecek veri setleri: MNIST, CIFAR-10, Iris, veya kendi seçiminiz.",
        courseId: aiCourse.id,
        createdById: instructor.id,
        dueDate: dueDate,
        allowedFileTypes: "pdf,ipynb,zip",
        maxFileSizeMb: 50
      }
    });
    console.log("Created AI/ML Assignment");
  }

  // Data Engineering Assignment
  let dataEngAssignment = await prisma.assignment.findFirst({ where: { title: "ETL Pipeline Tasarımı" } });
  if (!dataEngAssignment) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 10);
    dataEngAssignment = await prisma.assignment.create({
      data: {
        title: "ETL Pipeline Tasarımı",
        description: "Bir ETL pipeline tasarlayın ve uygulayın.\n\nGereksinimler:\n1. Kaynak veri tanımı (CSV, API, veya veritabanı)\n2. Data transformation adımları\n3. Hedef data warehouse şeması\n4. Apache Airflow DAG dosyası\n5. Dokümantasyon\n\nBonus: Docker compose ile çalıştırılabilir ortam.",
        courseId: dataEngCourse.id,
        createdById: instructor.id,
        dueDate: dueDate,
        allowedFileTypes: "pdf,zip,py",
        maxFileSizeMb: 30
      }
    });
    console.log("Created Data Engineering Assignment");
  }

  // ============ SUMMARY ============

  console.log("");
  console.log("=== Seed completed successfully! ===");
  console.log("");
  console.log("Users (Password: Password123!):");
  console.log("  - admin@example.com      → /admin");
  console.log("  - instructor@example.com → /instructor");
  console.log("  - assistant@example.com  → /instructor");
  console.log("  - student@example.com    → /student");
  console.log("  - guest@example.com      → /guest");
  console.log("");
  console.log("Courses:");
  console.log("  - Demo Course");
  console.log("  - Yapay Zeka ve Makine Öğrenmesi");
  console.log("  - Veri Mühendisliği Temelleri");
  console.log("");
  console.log("Exams:");
  console.log("  - Demo Exam (regular) - 5 questions");
  console.log("  - Secure Proctored Exam (SEB) - 5 questions");
  console.log("  - Yapay Zeka Final Sınavı (SEB) - 10 questions");
  console.log("  - Veri Mühendisliği Ara Sınav - 8 questions");
  console.log("");
  console.log("Assignments:");
  console.log("  - Demo Assignment (7 days)");
  console.log("  - Yapay Zeka Proje Ödevi (14 days)");
  console.log("  - ETL Pipeline Tasarımı (10 days)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
