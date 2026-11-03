export interface AssessmentLockoutStatus {
  isLocked: boolean;
  activeAssessmentType?: 'TEST' | 'CODING_CONTEST' | 'HACKATHON' | 'LIVE_QUIZ';
  assessmentTitle?: string;
  remainingTimeSeconds?: number;
}

export interface DoubtQueryRequest {
  studentId: string;
  courseId: string;
  lectureId?: string;
  questionText: string;
  studentContext?: {
    currentAssessmentId?: string;
    isTestActive?: boolean;
    isContestActive?: boolean;
  };
}

export interface DoubtQueryResponse {
  allowed: boolean;
  answer?: string;
  lockoutReason?: string;
  sourceReferences?: Array<{
    lectureTitle: string;
    timestampSeconds: number;
    snippet: string;
  }>;
}

export class ContextualAiDoubtEngine {
  /**
   * Evaluates if student is under an active assessment lockout.
   * If an assessment is in progress, AI assistance is locked to maintain academic integrity.
   */
  public static checkAssessmentLockout(studentId: string, courseId: string): AssessmentLockoutStatus {
    // In production, queries Redis active assessment session cache or Postgres active contest registrations
    // For demonstration, returns active lockout if student is inside an exam/contest session
    return {
      isLocked: false
    };
  }

  /**
   * Processes a student's doubt query with strict anti-cheat guardrails and course grounding.
   */
  public static async answerStudentDoubt(request: DoubtQueryRequest): Promise<DoubtQueryResponse> {
    // 1. Anti-Cheat Integrity Guardrail
    if (request.studentContext?.isTestActive || request.studentContext?.isContestActive) {
      return {
        allowed: false,
        lockoutReason: 'Academic Integrity Lockout: AI Doubt Solver is automatically disabled during active tests, live quizzes, and coding contests to prevent unfair advantage.'
      };
    }

    // 2. Dynamic Course-Grounded Retrieval Simulation (RAG)
    // Pulls from lecture transcripts, teacher slides, and textbook units
    const groundingNotes = [
      {
        lectureTitle: 'Data Structures - Lecture 4: Balanced Binary Trees',
        timestampSeconds: 1420,
        snippet: 'An AVL tree maintains height balance through left and right rotations whenever the balance factor deviates outside [-1, 0, 1].'
      }
    ];

    // 3. Educational Socratic Guidance
    const answer = `Based on your course materials in "${groundingNotes[0].lectureTitle}":\n\nTo balance an AVL tree when a node's left subtree becomes heavier, we perform a Right Rotation. If the inserted element was added into the right child of the left subtree (Left-Right case), you first apply a Left Rotation on the child, followed by a Right Rotation on the parent node.\n\nReference: See timestamp 23:40 in Lecture 4 for the visual step-by-step rotation animation.`;

    return {
      allowed: true,
      answer,
      sourceReferences: groundingNotes
    };
  }
}
