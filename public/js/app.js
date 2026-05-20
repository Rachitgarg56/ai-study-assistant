// Functions are now available globally from ui.js

// DOM Elements
const processBtn = document.getElementById('process-btn');
const youtubeUrlInput = document.getElementById('youtube-url');
const manualTranscriptInput = document.getElementById('manual-transcript');
const studyCenter = document.getElementById('study-center');
const studySessionTitle = document.getElementById('study-session-title');
const rawMarkdownCode = document.getElementById('raw-markdown-code');

// Action Buttons
const copyMarkdownBtn = document.getElementById('copy-markdown-btn');
const downloadMarkdownBtn = document.getElementById('download-markdown-btn');

// Quiz Elements
const quizQuestionText = document.getElementById('quiz-question-text');
const quizOptionsList = document.getElementById('quiz-options-list');
const quizExplanationBox = document.getElementById('quiz-explanation-box');
const quizExplanationText = document.getElementById('quiz-explanation-text');
const quizNextBtn = document.getElementById('quiz-next-btn');
const quizRestartBtn = document.getElementById('quiz-restart-btn');
const quizProgress = document.getElementById('quiz-progress');
const quizQuestionCounter = document.getElementById('quiz-question-counter');
const quizScoreDisplay = document.getElementById('quiz-score-display');

// Flashcard Elements
const fcFrontText = document.getElementById('fc-front-text');
const fcBackText = document.getElementById('fc-back-text');
const interactiveFlashcard = document.getElementById('interactive-flashcard');
const fcPrevBtn = document.getElementById('fc-prev-btn');
const fcNextBtn = document.getElementById('fc-next-btn');
const fcCounter = document.getElementById('fc-counter');

// Global Application State
let appState = {
  videoTitle: '',
  markdown: '',
  summary: [],
  keyConcepts: [],
  quiz: [],
  flashcards: [],
  // Quiz states
  quizIndex: 0,
  quizScore: 0,
  quizAnswersCount: 0,
  quizIsAnswered: false,
  // Flashcard states
  fcIndex: 0,
  fcFlipped: false
};

// -------------------------------------------------------------
// EVENT HANDLERS
// -------------------------------------------------------------

processBtn.addEventListener('click', async () => {
  const url = youtubeUrlInput.value.trim();
  const manualTranscript = manualTranscriptInput.value.trim();
  
  // Validation
  const activeInputTab = document.querySelector('.input-tabs .tab-btn.active').getAttribute('data-target');
  
  if (activeInputTab === 'youtube-tab' && !url) {
    alert('Please enter a YouTube video URL.');
    return;
  }
  
  if (activeInputTab === 'manual-tab' && !manualTranscript) {
    alert('Please paste a video transcript.');
    return;
  }

  // Disable button, show loading state
  processBtn.disabled = true;
  processBtn.innerHTML = `
    <i class="fa-solid fa-circle-notch fa-spin"></i>
    <span>Coordinating Agents...</span>
  `;
  
  // Clear outputs
  studyCenter.style.display = 'none';
  clearTerminal();
  resetAgentNodes();

  addTerminalLine('system', 'Contacting Coordinator backend server...');
  addTerminalLine('system', 'Registering modular agent nodes...');

  // Fetch local storage configurations
  const isMock = localStorage.getItem('mock_mode') !== 'false';
  const apiKey = localStorage.getItem('gemini_api_key') || '';

  try {
    const response = await fetch('/api/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: activeInputTab === 'youtube-tab' ? url : '',
        manualTranscript: activeInputTab === 'manual-tab' ? manualTranscript : '',
        apiKey,
        mockMode: isMock
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Server error occurred during execution.');
    }

    // Playback logs in terminal sequentially to simulate live agent cooperation
    await playAgentCommunicationLogs(data.logs);

    // Save outputs to local state
    appState.videoTitle = data.videoTitle;
    appState.markdown = data.markdown;
    appState.summary = data.structuredData.summary;
    appState.keyConcepts = data.structuredData.keyConcepts;
    appState.quiz = data.structuredData.quiz;
    appState.flashcards = data.structuredData.flashcards;

    // Render components
    studySessionTitle.textContent = appState.videoTitle;
    renderSummary(appState.summary);
    renderConcepts(appState.keyConcepts);
    setupInteractiveQuiz(appState.quiz);
    setupInteractiveFlashcards(appState.flashcards);
    rawMarkdownCode.textContent = appState.markdown;

    // Reveal study center
    studyCenter.style.display = 'block';
    studyCenter.scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (error) {
    console.error('Execution failed:', error);
    addTerminalLine('system', `FATAL ERROR: ${error.message}`);
    alert(`Error: ${error.message}`);
  } finally {
    processBtn.disabled = false;
    processBtn.innerHTML = `
      <span>Coordinate Study Agents</span>
      <i class="fa-solid fa-arrow-right"></i>
    `;
  }
});

// -------------------------------------------------------------
// TERMINAL LOG REPLAY ENGINE
// -------------------------------------------------------------

async function playAgentCommunicationLogs(logs) {
  if (!logs || logs.length === 0) return;
  
  clearTerminal();
  addTerminalLine('system', 'System connection established. Commencing pipeline analysis...');

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    
    // Highlight nodes in UI
    resetAgentNodes();
    
    if (log.sender !== 'User' && log.sender !== 'Coordinator') {
      highlightAgentNode(log.sender);
    }
    if (log.receiver !== 'User' && log.receiver !== 'Coordinator') {
      highlightAgentNode(log.receiver);
    }

    // Write log entry
    addTerminalLine('agent', null, {
      sender: log.sender,
      receiver: log.receiver,
      command: log.message,
      preview: log.preview
    });

    // Mark previous processes as completed
    if (log.message === 'TRANSCRIPT_READY') {
      completeAgentNode('TranscriptAgent');
    } else if (log.message === 'SUMMARY_READY') {
      completeAgentNode('SummaryAgent');
    } else if (log.message === 'QUIZ_READY') {
      completeAgentNode('QuizAgent');
    } else if (log.message === 'FLASHCARDS_READY') {
      completeAgentNode('FlashcardAgent');
    } else if (log.message === 'FORMATTING_READY') {
      completeAgentNode('FormatterAgent');
    }

    // Dynamic delay for realistic terminal typing/flow
    const delay = log.message.includes('READY') || log.message === 'WORKFLOW_COMPLETE' ? 1200 : 700;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Complete all nodes at the end
  completeAgentNode('TranscriptAgent');
  completeAgentNode('SummaryAgent');
  completeAgentNode('QuizAgent');
  completeAgentNode('FlashcardAgent');
  completeAgentNode('FormatterAgent');
  
  addTerminalLine('system', 'All agent outputs coordinated successfully. Opening Study Center.');
}

// -------------------------------------------------------------
// INTERACTIVE PRACTICE QUIZ SYSTEM
// -------------------------------------------------------------

function setupInteractiveQuiz(questions) {
  appState.quiz = questions;
  appState.quizIndex = 0;
  appState.quizScore = 0;
  appState.quizAnswersCount = 0;
  
  quizRestartBtn.style.display = 'none';
  
  if (!questions || questions.length === 0) {
    quizQuestionText.textContent = 'No quiz questions generated.';
    quizOptionsList.innerHTML = '';
    return;
  }

  showQuizQuestion(0);
}

function showQuizQuestion(index) {
  appState.quizIndex = index;
  appState.quizIsAnswered = false;
  
  const question = appState.quiz[index];
  
  quizQuestionCounter.textContent = `Question ${index + 1} of ${appState.quiz.length}`;
  quizScoreDisplay.textContent = `Score: ${appState.quizScore}/${appState.quizAnswersCount}`;
  
  // Progress Bar
  const progressPercent = (index / appState.quiz.length) * 100;
  quizProgress.style.width = `${progressPercent}%`;

  quizQuestionText.textContent = question.question;
  quizOptionsList.innerHTML = '';
  quizExplanationBox.style.display = 'none';
  quizNextBtn.style.display = 'none';

  const optionLabels = ['A', 'B', 'C', 'D'];
  
  question.options.forEach((option, oIdx) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option-btn';
    btn.innerHTML = `
      <span class="badge-index">${optionLabels[oIdx]}</span>
      <span class="option-text">${option}</span>
    `;
    
    btn.addEventListener('click', () => {
      if (appState.quizIsAnswered) return;
      handleQuizAnswer(oIdx, btn);
    });

    quizOptionsList.appendChild(btn);
  });
}

function handleQuizAnswer(selectedIdx, clickedBtn) {
  appState.quizIsAnswered = true;
  appState.quizAnswersCount++;
  
  const question = appState.quiz[appState.quizIndex];
  const correctIdx = question.answerIndex;
  
  const optionButtons = quizOptionsList.querySelectorAll('.quiz-option-btn');
  
  // Disable options and highlight answers
  optionButtons.forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === correctIdx) {
      btn.classList.add('correct');
      // Add Check Icon
      const icon = document.createElement('i');
      icon.className = 'fa-solid fa-circle-check';
      icon.style.marginLeft = 'auto';
      btn.appendChild(icon);
    }
  });

  if (selectedIdx === correctIdx) {
    appState.quizScore++;
  } else {
    clickedBtn.classList.add('wrong');
    // Add Cross Icon
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-circle-xmark';
    icon.style.marginLeft = 'auto';
    clickedBtn.appendChild(icon);
  }

  // Update Score Indicator
  quizScoreDisplay.textContent = `Score: ${appState.quizScore}/${appState.quizAnswersCount}`;

  // Show Explanation
  quizExplanationText.textContent = question.explanation;
  quizExplanationBox.style.display = 'block';

  // Toggle Action Buttons
  if (appState.quizIndex < appState.quiz.length - 1) {
    quizNextBtn.style.display = 'block';
  } else {
    // End of quiz
    quizProgress.style.width = '100%';
    quizNextBtn.style.display = 'none';
    quizRestartBtn.style.display = 'block';
    
    // Add custom quiz completion log
    const scorePct = Math.round((appState.quizScore / appState.quiz.length) * 100);
    alert(`Quiz Complete! You scored ${appState.quizScore} out of ${appState.quiz.length} (${scorePct}%).`);
  }
}

// Quiz Navigation Action Buttons
quizNextBtn.addEventListener('click', () => {
  if (appState.quizIndex < appState.quiz.length - 1) {
    showQuizQuestion(appState.quizIndex + 1);
  }
});

quizRestartBtn.addEventListener('click', () => {
  setupInteractiveQuiz(appState.quiz);
});

// -------------------------------------------------------------
// INTERACTIVE FLASHCARDS CAROUSEL
// -------------------------------------------------------------

function setupInteractiveFlashcards(cards) {
  appState.flashcards = cards;
  appState.fcIndex = 0;
  appState.fcFlipped = false;

  if (!cards || cards.length === 0) {
    fcFrontText.textContent = 'No flashcards generated.';
    fcBackText.textContent = '';
    fcCounter.textContent = '0 of 0';
    return;
  }

  showFlashcard(0);
}

function showFlashcard(index) {
  appState.fcIndex = index;
  appState.fcFlipped = false;
  
  // Remove flipped rotation style
  interactiveFlashcard.classList.remove('flipped');
  
  const card = appState.flashcards[index];
  
  // Set card contents
  fcFrontText.textContent = card.front;
  fcBackText.textContent = card.back;
  
  // Update footer text indicator
  fcCounter.textContent = `Card ${index + 1} of ${appState.flashcards.length}`;
}

// Flashcard card click to flip
interactiveFlashcard.addEventListener('click', () => {
  appState.fcFlipped = !appState.fcFlipped;
  if (appState.fcFlipped) {
    interactiveFlashcard.classList.add('flipped');
  } else {
    interactiveFlashcard.classList.remove('flipped');
  }
});

// Carousel Prev Button
fcPrevBtn.addEventListener('click', (e) => {
  e.stopPropagation(); // Avoid card flipping trigger
  if (appState.fcIndex > 0) {
    showFlashcard(appState.fcIndex - 1);
  } else {
    // Loop around to end
    showFlashcard(appState.flashcards.length - 1);
  }
});

// Carousel Next Button
fcNextBtn.addEventListener('click', (e) => {
  e.stopPropagation(); // Avoid card flipping trigger
  if (appState.fcIndex < appState.flashcards.length - 1) {
    showFlashcard(appState.fcIndex + 1);
  } else {
    // Loop around to beginning
    showFlashcard(0);
  }
});

// -------------------------------------------------------------
// EXPORT & DOWNLOAD STUDY MATERIAL
// -------------------------------------------------------------

// Copy to Clipboard
copyMarkdownBtn.addEventListener('click', () => {
  if (!appState.markdown) return;
  
  navigator.clipboard.writeText(appState.markdown)
    .then(() => {
      const prevHtml = copyMarkdownBtn.innerHTML;
      copyMarkdownBtn.innerHTML = `<i class="fa-solid fa-check"></i> Copied!`;
      copyMarkdownBtn.classList.remove('btn-secondary');
      copyMarkdownBtn.classList.add('btn-primary');
      
      setTimeout(() => {
        copyMarkdownBtn.innerHTML = prevHtml;
        copyMarkdownBtn.classList.remove('btn-primary');
        copyMarkdownBtn.classList.add('btn-secondary');
      }, 2000);
    })
    .catch(err => {
      console.error('Clipboard copy failed:', err);
      alert('Failed to copy to clipboard.');
    });
});

// File Downloader
downloadMarkdownBtn.addEventListener('click', () => {
  if (!appState.markdown) return;
  
  const blob = new Blob([appState.markdown], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  
  // Format clean file names
  const cleanTitle = appState.videoTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_+|_+$)/g, '');
    
  link.setAttribute('download', `${cleanTitle}_study_notes.md`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
});
