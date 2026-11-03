import { Server as SocketIOServer, Socket } from 'socket.io';

export interface ClassroomState {
  sessionId: string;
  lectureId: string;
  teacherSocketId?: string;
  activeSlideIndex: number;
  whiteboardDataUrl?: string;
  isMutedAll: boolean;
  handRaiseQueue: Array<{ studentId: string; studentName: string; raisedAt: number }>;
  activeQuiz?: {
    quizId: string;
    questionText: string;
    options: string[];
    launchedAtMillis: number;
    timeLimitSeconds: number;
    correctOptionIdx: number;
    submissions: Array<{
      studentId: string;
      studentName: string;
      selectedOption: number;
      isCorrect: boolean;
      elapsedMillis: number;
    }>;
  };
  audioVideoAlertReports: Array<{
    studentId: string;
    issueType: 'MIC_INAUDIBLE' | 'CAMERA_FROZEN' | 'FEED_LAG';
    timestamp: number;
  }>;
}

export class ClassroomRealtimeManager {
  private io: SocketIOServer;
  private roomStates: Map<string, ClassroomState> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
    this.registerSocketHandlers();
  }

  private registerSocketHandlers() {
    this.io.on('connection', (socket: Socket) => {
      // 1. Join Classroom Room
      socket.on('JOIN_CLASSROOM', (data: {
        sessionId: string;
        userId: string;
        userName: string;
        userRole: 'TEACHER' | 'STUDENT';
      }) => {
        socket.join(data.sessionId);

        let state = this.roomStates.get(data.sessionId);
        if (!state) {
          state = {
            sessionId: data.sessionId,
            lectureId: data.sessionId,
            activeSlideIndex: 1,
            isMutedAll: false,
            handRaiseQueue: [],
            audioVideoAlertReports: []
          };
          this.roomStates.set(data.sessionId, state);
        }

        if (data.userRole === 'TEACHER') {
          state.teacherSocketId = socket.id;
          // Notify students that teacher is back (resumed after power cut / network switch)
          socket.to(data.sessionId).emit('TEACHER_RECONNECTED', {
            message: 'Teacher has re-established connection. Resuming live session.'
          });
        }

        // Send current session checkpoint to joining client
        socket.emit('CLASSROOM_STATE_SYNC', {
          activeSlideIndex: state.activeSlideIndex,
          isMutedAll: state.isMutedAll,
          handRaiseQueue: state.handRaiseQueue,
          activeQuiz: state.activeQuiz ? {
            quizId: state.activeQuiz.quizId,
            questionText: state.activeQuiz.questionText,
            options: state.activeQuiz.options,
            timeLimitSeconds: state.activeQuiz.timeLimitSeconds,
            launchedAtMillis: state.activeQuiz.launchedAtMillis
          } : null
        });
      });

      // 2. "Teacher Inaudible / Invisible" Panic Alert from Student
      socket.on('REPORT_AV_ISSUE', (data: {
        sessionId: string;
        studentId: string;
        studentName: string;
        issueType: 'MIC_INAUDIBLE' | 'CAMERA_FROZEN' | 'FEED_LAG';
      }) => {
        const state = this.roomStates.get(data.sessionId);
        if (!state) return;

        const now = Date.now();
        // Prune alerts older than 10 seconds
        state.audioVideoAlertReports = state.audioVideoAlertReports.filter(
          r => now - r.timestamp < 10000
        );

        // Add this student's alert if not reported in last 10s
        const alreadyReported = state.audioVideoAlertReports.some(
          r => r.studentId === data.studentId && r.issueType === data.issueType
        );

        if (!alreadyReported) {
          state.audioVideoAlertReports.push({
            studentId: data.studentId,
            issueType: data.issueType,
            timestamp: now
          });
        }

        const recentAlerts = state.audioVideoAlertReports;
        const micAlerts = recentAlerts.filter(r => r.issueType === 'MIC_INAUDIBLE').length;
        const camAlerts = recentAlerts.filter(r => r.issueType === 'CAMERA_FROZEN').length;

        // If >= 3 students report within the window, alert teacher HUD immediately
        if (micAlerts >= 3 || camAlerts >= 3 || recentAlerts.length >= 3) {
          if (state.teacherSocketId) {
            this.io.to(state.teacherSocketId).emit('TEACHER_HUD_ALERT', {
              severity: 'URGENT',
              totalReports: recentAlerts.length,
              micAlerts,
              camAlerts,
              headline: `Attention: ${recentAlerts.length} students report audio/video issues!`,
              suggestedActions: [
                'Verify your microphone input device in audio settings',
                'Check if your camera is enabled or unmuted',
                'Toggle low-bandwidth streaming mode if internet is fluctuating'
              ]
            });
          }
        }
      });

      // 3. Live Pop Quiz - Fastest-Finger-First (FFF) Engine
      socket.on('LAUNCH_LIVE_QUIZ', (data: {
        sessionId: string;
        quizId: string;
        questionText: string;
        options: string[];
        correctOptionIdx: number;
        timeLimitSeconds: number;
      }) => {
        const state = this.roomStates.get(data.sessionId);
        if (!state) return;

        const launchedAt = Date.now();
        state.activeQuiz = {
          quizId: data.quizId,
          questionText: data.questionText,
          options: data.options,
          correctOptionIdx: data.correctOptionIdx,
          timeLimitSeconds: data.timeLimitSeconds,
          launchedAtMillis: launchedAt,
          submissions: []
        };

        // Broadcast to all students in room
        this.io.to(data.sessionId).emit('QUIZ_LAUNCHED', {
          quizId: data.quizId,
          questionText: data.questionText,
          options: data.options,
          timeLimitSeconds: data.timeLimitSeconds,
          launchedAtMillis: launchedAt
        });
      });

      socket.on('SUBMIT_QUIZ_ANSWER', (data: {
        sessionId: string;
        quizId: string;
        studentId: string;
        studentName: string;
        selectedOption: number;
      }) => {
        const state = this.roomStates.get(data.sessionId);
        if (!state || !state.activeQuiz || state.activeQuiz.quizId !== data.quizId) return;

        const serverNow = Date.now();
        const elapsedMillis = serverNow - state.activeQuiz.launchedAtMillis;
        const isCorrect = data.selectedOption === state.activeQuiz.correctOptionIdx;

        // Prevent duplicate submissions
        if (state.activeQuiz.submissions.some(s => s.studentId === data.studentId)) {
          return;
        }

        const submission = {
          studentId: data.studentId,
          studentName: data.studentName,
          selectedOption: data.selectedOption,
          isCorrect,
          elapsedMillis
        };

        state.activeQuiz.submissions.push(submission);

        // Notify student of individual receipt
        socket.emit('QUIZ_SUBMISSION_ACK', {
          isCorrect,
          elapsedMillis
        });

        // Check if this submission is the fastest correct answer so far
        const correctSubmissions = state.activeQuiz.submissions
          .filter(s => s.isCorrect)
          .sort((a, b) => a.elapsedMillis - b.elapsedMillis);

        if (correctSubmissions.length > 0 && correctSubmissions[0].studentId === data.studentId) {
          // Announce current leader or winner to room
          this.io.to(data.sessionId).emit('QUIZ_FASTEST_LEADER', {
            winnerStudentName: data.studentName,
            timeTakenSeconds: (elapsedMillis / 1000).toFixed(2),
            totalSubmissions: state.activeQuiz.submissions.length
          });
        }
      });

      socket.on('END_LIVE_QUIZ', (data: { sessionId: string }) => {
        const state = this.roomStates.get(data.sessionId);
        if (!state || !state.activeQuiz) return;

        const correctSubmissions = state.activeQuiz.submissions
          .filter(s => s.isCorrect)
          .sort((a, b) => a.elapsedMillis - b.elapsedMillis);

        const winner = correctSubmissions[0] || null;

        this.io.to(data.sessionId).emit('QUIZ_COMPLETED_LEADERBOARD', {
          winner: winner ? {
            studentName: winner.studentName,
            timeSeconds: (winner.elapsedMillis / 1000).toFixed(2)
          } : null,
          totalParticipants: state.activeQuiz.submissions.length,
          correctCount: correctSubmissions.length,
          leaderboard: correctSubmissions.slice(0, 5).map((s, idx) => ({
            rank: idx + 1,
            name: s.studentName,
            timeSeconds: (s.elapsedMillis / 1000).toFixed(2)
          }))
        });

        state.activeQuiz = undefined;
      });

      // 4. Hand Raise & Moderation
      socket.on('TOGGLE_HAND_RAISE', (data: {
        sessionId: string;
        studentId: string;
        studentName: string;
      }) => {
        const state = this.roomStates.get(data.sessionId);
        if (!state) return;

        const existingIndex = state.handRaiseQueue.findIndex(h => h.studentId === data.studentId);
        if (existingIndex >= 0) {
          state.handRaiseQueue.splice(existingIndex, 1);
        } else {
          state.handRaiseQueue.push({
            studentId: data.studentId,
            studentName: data.studentName,
            raisedAt: Date.now()
          });
        }

        this.io.to(data.sessionId).emit('HAND_RAISE_QUEUE_UPDATED', {
          queue: state.handRaiseQueue
        });
      });

      // 5. In-Stream Resource Distribution
      socket.on('PUSH_LIVE_RESOURCE', (data: {
        sessionId: string;
        title: string;
        fileUrl: string;
        resourceType: 'NOTE' | 'EXERCISE' | 'ASSIGNMENT';
      }) => {
        this.io.to(data.sessionId).emit('NEW_RESOURCE_PUSHED', {
          title: data.title,
          fileUrl: data.fileUrl,
          resourceType: data.resourceType,
          timestamp: Date.now()
        });
      });

      // 6. Classroom State Checkpoint (Slide Navigation / Whiteboard)
      socket.on('UPDATE_CLASSROOM_CHECKPOINT', (data: {
        sessionId: string;
        slideIndex: number;
        whiteboardDataUrl?: string;
      }) => {
        const state = this.roomStates.get(data.sessionId);
        if (!state) return;
        state.activeSlideIndex = data.slideIndex;
        if (data.whiteboardDataUrl) {
          state.whiteboardDataUrl = data.whiteboardDataUrl;
        }

        socket.to(data.sessionId).emit('CLASSROOM_CHECKPOINT_SYNC', {
          slideIndex: state.activeSlideIndex,
          whiteboardDataUrl: state.whiteboardDataUrl
        });
      });

      // 7. WebRTC Live Camera & Screen Share Signaling Mesh
      socket.on('WEBRTC_SIGNAL', (data: {
        sessionId: string;
        targetSocketId?: string;
        signal: any;
        senderRole: 'TEACHER' | 'STUDENT';
      }) => {
        if (data.targetSocketId) {
          // Send direct point-to-point signal to specific peer
          this.io.to(data.targetSocketId).emit('WEBRTC_SIGNAL', {
            senderSocketId: socket.id,
            signal: data.signal,
            senderRole: data.senderRole
          });
        } else {
          // Broadcast to everyone else in room
          socket.to(data.sessionId).emit('WEBRTC_SIGNAL', {
            senderSocketId: socket.id,
            signal: data.signal,
            senderRole: data.senderRole
          });
        }
      });

      // 8. Real-time Multi-Device Whiteboard Sync
      socket.on('WHITEBOARD_DRAW_EVENT', (data: {
        sessionId: string;
        drawType: 'LINE' | 'RECT' | 'CLEAR';
        payload: any;
      }) => {
        socket.to(data.sessionId).emit('WHITEBOARD_DRAW_EVENT', data);
      });

      // 9. Real-time Classroom Chat
      socket.on('SEND_CHAT_MESSAGE', (data: {
        sessionId: string;
        senderName: string;
        senderRole: string;
        text: string;
      }) => {
        const messagePayload = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          senderName: data.senderName,
          senderRole: data.senderRole,
          text: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        this.io.to(data.sessionId).emit('NEW_CHAT_MESSAGE', messagePayload);
      });
    });
  }
}
