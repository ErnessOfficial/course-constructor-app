import { CourseBuilder } from '../utils/CourseBuilder';

// Example course creation using the builder
export const createExampleCourse = () => {
  const builder = new CourseBuilder();
  
  return builder
    // Basic course info
    .setId('gestion-del-estres')
    .setTitle('Gestión del Estrés Cotidiano')
    .setSubtitle('Herramientas prácticas para manejar el estrés diario')
    .setDescription('Un curso práctico que te ayudará a identificar y manejar el estrés en tu vida diaria.')
    .setCategory('Bienestar')
    .setBroadCategories(['Gestión Emocional'])
    .setCoverImage('images/courses/estres-cover.jpg')
    .setInstructor('María González', 'images/avatars/maria-gonzalez.jpg')
    .setLearningObjectives([
      'Identificar las causas comunes del estrés cotidiano',
      'Aprender técnicas de respiración y relajación',
      'Desarrollar estrategias de gestión del tiempo',
      'Crear un plan personal de manejo del estrés',
      'Implementar hábitos saludables en la rutina diaria'
    ])

    // Module 1: Introduction
    .addModule('Introducción al Estrés')
    .addVideoActivity(
      'Bienvenida al curso',
      'Video introductorio sobre el contenido del curso',
      'videos/m1/bienvenida.mp4'
    )
    .addTextActivity(
      '¿Qué es el estrés?',
      'Comprensión básica del estrés y sus efectos',
      [
        'El estrés es la respuesta natural del cuerpo ante situaciones que percibimos como amenazantes o desafiantes.',
        'En este módulo aprenderemos a identificar las señales del estrés y su impacto en nuestra vida diaria.'
      ],
      {
        imagePath: 'images/m1/stress-diagram.png'
      }
    )
    .addQuizActivity(
      'Evaluación inicial',
      'Identifica tu nivel actual de estrés',
      [
        {
          question: '¿Con qué frecuencia te sientes abrumado/a por tus responsabilidades?',
          options: [
            {
              text: 'Casi nunca',
              feedback: 'Es positivo mantener un buen manejo de responsabilidades. ¿Qué estrategias utilizas?'
            },
            {
              text: 'Ocasionalmente',
              feedback: 'Es normal sentirse así a veces. Exploraremos técnicas para estos momentos.'
            },
            {
              text: 'Frecuentemente',
              feedback: 'El curso te ayudará a desarrollar herramientas para manejar mejor la carga diaria.'
            }
          ]
        }
      ]
    )

    // Module 2: Techniques
    .addModule('Técnicas de Relajación')
    .addYouTubeActivity(
      'Ejercicio de respiración guiada',
      'Aprende técnicas básicas de respiración para reducir el estrés',
      'https://youtu.be/example-id'
    )
    .addAudioActivity(
      'Meditación guiada',
      'Sesión de 10 minutos de meditación para la reducción del estrés',
      'audios/m2/meditation.mp3'
    )
    .addIframeActivity(
      'Ejercicios prácticos',
      'Serie de ejercicios interactivos para practicar las técnicas aprendidas',
      {
        content: [
          '<div class="exercise-container">',
          '  <h3>Ejercicio 1: Respiración consciente</h3>',
          '  <p>Sigue los pasos mostrados en la animación:</p>',
          '  <img src="/public/images/m2/breathing-exercise.gif" alt="Animación de respiración" />',
          '</div>'
        ],
        hideHeader: true
      }
    )
    .build();
};