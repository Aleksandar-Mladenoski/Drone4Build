/**
 * SCORM 1.2 / SCORM 2004 API Wrapper
 * Communicates with LMS (OpenEdX SCORM XBlock, Moodle, Canvas, Blackboard, etc.)
 */

interface SCORMAPI {
  LMSInitialize(param: string): string;
  LMSFinish(param: string): string;
  LMSGetValue(element: string): string;
  LMSSetValue(element: string, value: string): string;
  LMSCommit(param: string): string;
  LMSGetLastError(): string;
  LMSGetErrorString(errorCode: string): string;
  LMSGetDiagnostic(errorCode: string): string;
}

interface SCORM2004API {
  Initialize(param: string): string;
  Terminate(param: string): string;
  GetValue(element: string): string;
  SetValue(element: string, value: string): string;
  Commit(param: string): string;
}

let scormAPI: SCORMAPI | null = null;
let scorm2004API: SCORM2004API | null = null;
let isInitialized = false;

/**
 * Searches current window and parent frames for SCORM API object
 */
function findSCORMAPI(win: any): SCORMAPI | null {
  let findAttempts = 0;
  const maxAttempts = 10;
  let currentWindow = win;

  while (currentWindow && findAttempts < maxAttempts) {
    if (currentWindow.API) {
      return currentWindow.API;
    }
    if (currentWindow.parent && currentWindow.parent !== currentWindow) {
      findAttempts++;
      currentWindow = currentWindow.parent;
    } else {
      break;
    }
  }
  return null;
}

function findSCORM2004API(win: any): SCORM2004API | null {
  let findAttempts = 0;
  const maxAttempts = 10;
  let currentWindow = win;

  while (currentWindow && findAttempts < maxAttempts) {
    if (currentWindow.API_1484_11) {
      return currentWindow.API_1484_11;
    }
    if (currentWindow.parent && currentWindow.parent !== currentWindow) {
      findAttempts++;
      currentWindow = currentWindow.parent;
    } else {
      break;
    }
  }
  return null;
}

/**
 * Initialize SCORM connection with LMS
 */
export function initSCORM(): boolean {
  if (isInitialized) return true;

  try {
    // Check window and parent frames for SCORM 1.2 API
    scormAPI = findSCORMAPI(window);
    if (!scormAPI && window.opener) {
      scormAPI = findSCORMAPI(window.opener);
    }

    if (scormAPI) {
      const result = scormAPI.LMSInitialize('');
      if (result === 'true' || result === '1' || result === '0') {
        isInitialized = true;
        console.log('[SCORM 1.2] API initialized successfully.');
        
        // Ensure lesson status is incomplete upon start if not already completed
        const currentStatus = scormAPI.LMSGetValue('cmi.core.lesson_status');
        if (currentStatus !== 'passed' && currentStatus !== 'completed') {
          scormAPI.LMSSetValue('cmi.core.lesson_status', 'incomplete');
          scormAPI.LMSCommit('');
        }
        return true;
      }
    }

    // Check SCORM 2004 API as fallback
    scorm2004API = findSCORM2004API(window);
    if (!scorm2004API && window.opener) {
      scorm2004API = findSCORM2004API(window.opener);
    }

    if (scorm2004API) {
      const result = scorm2004API.Initialize('');
      if (result === 'true' || result === '1' || result === '0') {
        isInitialized = true;
        console.log('[SCORM 2004] API initialized successfully.');
        const currentStatus = scorm2004API.GetValue('cmi.completion_status');
        if (currentStatus !== 'completed') {
          scorm2004API.SetValue('cmi.completion_status', 'incomplete');
          scorm2004API.Commit('');
        }
        return true;
      }
    }

    console.warn('[SCORM] LMS API not detected. Running in standalone mode.');
  } catch (err) {
    console.warn('[SCORM] Error during initialization:', err);
  }

  return false;
}

/**
 * Record score (0-100)
 */
export function setSCORMScore(rawScore: number, minScore = 0, maxScore = 100): void {
  if (!isInitialized) initSCORM();

  try {
    if (scormAPI) {
      scormAPI.LMSSetValue('cmi.core.score.raw', rawScore.toString());
      scormAPI.LMSSetValue('cmi.core.score.min', minScore.toString());
      scormAPI.LMSSetValue('cmi.core.score.max', maxScore.toString());
      scormAPI.LMSCommit('');
      console.log(`[SCORM 1.2] Recorded score: ${rawScore}`);
    } else if (scorm2004API) {
      const scaled = rawScore / maxScore;
      scorm2004API.SetValue('cmi.score.raw', rawScore.toString());
      scorm2004API.SetValue('cmi.score.min', minScore.toString());
      scorm2004API.SetValue('cmi.score.max', maxScore.toString());
      scorm2004API.SetValue('cmi.score.scaled', scaled.toString());
      scorm2004API.Commit('');
      console.log(`[SCORM 2004] Recorded score: ${rawScore}`);
    }
  } catch (err) {
    console.error('[SCORM] Error setting score:', err);
  }
}

/**
 * Mark course as completed / passed in LMS gradebook
 */
export function setSCORMComplete(score = 100): void {
  if (!isInitialized) initSCORM();

  try {
    setSCORMScore(score);

    if (scormAPI) {
      scormAPI.LMSSetValue('cmi.core.lesson_status', 'passed');
      scormAPI.LMSCommit('');
      console.log('[SCORM 1.2] Lesson status set to PASSED.');
    } else if (scorm2004API) {
      scorm2004API.SetValue('cmi.completion_status', 'completed');
      scorm2004API.SetValue('cmi.success_status', 'passed');
      scorm2004API.Commit('');
      console.log('[SCORM 2004] Completion status set to PASSED.');
    }
  } catch (err) {
    console.error('[SCORM] Error marking complete:', err);
  }
}

/**
 * Finalize SCORM connection on window unload
 */
export function finishSCORM(): void {
  if (!isInitialized) return;

  try {
    if (scormAPI) {
      scormAPI.LMSCommit('');
      scormAPI.LMSFinish('');
      isInitialized = false;
      console.log('[SCORM 1.2] Session finished.');
    } else if (scorm2004API) {
      scorm2004API.Commit('');
      scorm2004API.Terminate('');
      isInitialized = false;
      console.log('[SCORM 2004] Session terminated.');
    }
  } catch (err) {
    console.error('[SCORM] Error finishing session:', err);
  }
}
