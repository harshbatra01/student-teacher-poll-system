import { Server, Socket } from 'socket.io';
import { pollService } from '../services/PollService';
import { studentService } from '../services/StudentService';
import { CreatePollPayload, JoinPayload, VotePayload, KickPayload, ChatMessagePayload } from '../types';

export const setupPollSocketHandler = (socketServer: Server): void => {
    // Set up poll end callback to broadcast to all clients
    pollService.setOnPollEnd((finalResults) => {
        socketServer.emit('poll:ended', finalResults);
    });

    socketServer.on('connection', (clientSocket: Socket) => {
        console.log(`🔌 Client connected: ${clientSocket.id}`);

        // ─── Teacher Join ────────────────────────────────────
        clientSocket.on('teacher:join', async (payload: JoinPayload) => {
            clientSocket.join('teachers');
            console.log(`👨‍🏫 Teacher joined: ${clientSocket.id}`);

            const currentState = await pollService.getCurrentState();
            const enrolledStudents = studentService.getActiveStudents();

            clientSocket.emit('poll:state', {
                currentPoll: currentState.currentPoll,
                students: enrolledStudents,
                hasVoted: false,
                chatMessages: currentState.chatMessages,
            });
        });

        // ─── Student Join ────────────────────────────────────
        clientSocket.on('student:join', async (payload: JoinPayload) => {
            if (!payload.name || !payload.tabId) {
                clientSocket.emit('error', { message: 'Name and tabId are required.' });
                return;
            }

            clientSocket.join('students');
            await studentService.registerStudent(payload.name, payload.tabId, clientSocket.id);
            console.log(`🎓 Student joined: ${payload.name} (${payload.tabId})`);

            // Send current poll state to the joining student
            const currentState = await pollService.getCurrentState(payload.tabId);
            clientSocket.emit('poll:state', {
                currentPoll: currentState.currentPoll,
                students: studentService.getActiveStudents(),
                hasVoted: currentState.hasVoted,
                votedOption: currentState.votedOption,
                chatMessages: currentState.chatMessages,
            });

            // Notify ALL clients about new student
            socketServer.emit('student:joined', {
                students: studentService.getActiveStudents(),
            });
        });

        // ─── Create Poll ─────────────────────────────────────
        clientSocket.on('poll:create', async (payload: CreatePollPayload) => {
            console.log(`📊 Creating poll: ${payload.question}`);

            const outcome = await pollService.createPoll(payload);

            if (!outcome.success) {
                clientSocket.emit('error', { message: outcome.error });
                return;
            }

            // Broadcast new poll to ALL connected clients
            socketServer.emit('poll:new', outcome.poll);

            // Also broadcast the current active students so the teacher's new dashboard gets populated
            socketServer.emit('student:joined', {
                students: studentService.getActiveStudents(),
            });
        });

        // ─── Vote ────────────────────────────────────────────
        clientSocket.on('poll:vote', async (payload: VotePayload) => {
            console.log(`🗳️  Vote from ${payload.tabId}: option ${payload.optionIndex}`);

            const voteOutcome = await pollService.submitVote(payload.tabId, payload.optionIndex);

            if (!voteOutcome.success) {
                clientSocket.emit('error', { message: voteOutcome.error });
                return;
            }

            // Broadcast updated results to ALL clients
            socketServer.emit('poll:results', voteOutcome.results);
        });

        // ─── Kick Student ────────────────────────────────────
        clientSocket.on('poll:kick', async (payload: KickPayload) => {
            console.log(`🚫 Kicking student: ${payload.tabId}`);

            const removedStudent = await studentService.kickStudent(payload.tabId);
            if (removedStudent) {
                // Find the socket of the kicked student and notify them
                const targetSocket = socketServer.sockets.sockets.get(removedStudent.socketId);
                if (targetSocket) {
                    targetSocket.emit('student:kicked', { message: 'You have been kicked from the session.' });
                    targetSocket.leave('students');
                }

                // Notify ALL clients about updated student list
                socketServer.emit('student:joined', {
                    students: studentService.getActiveStudents(),
                });
            }
        });

        // ─── Chat Message ────────────────────────────────────
        clientSocket.on('chat:message', (payload: ChatMessagePayload) => {
            console.log(`💬 Chat from ${payload.senderName}: ${payload.text}`);
            const chatEntry = pollService.addChatMessage(payload);
            socketServer.emit('chat:message', chatEntry);
        });

        // ─── Reconnection / State Recovery ───────────────────
        clientSocket.on('poll:getState', async (payload: { tabId?: string; role: string }) => {
            const recoveredState = await pollService.getCurrentState(payload.tabId);

            // If student is reconnecting, update their socket ID and notify others
            if (payload.role === 'student' && payload.tabId) {
                await studentService.updateSocketId(payload.tabId, clientSocket.id);
                clientSocket.join('students');

                // Notify ALL clients that student is active again
                socketServer.emit('student:joined', {
                    students: studentService.getActiveStudents(),
                });
            } else if (payload.role === 'teacher') {
                clientSocket.join('teachers');
            }

            // Get the updated list of students AFTER the user has reconnected and been marked active
            const enrolledStudents = studentService.getActiveStudents();

            clientSocket.emit('poll:state', {
                currentPoll: recoveredState.currentPoll,
                students: enrolledStudents,
                hasVoted: recoveredState.hasVoted,
                votedOption: recoveredState.votedOption,
                chatMessages: recoveredState.chatMessages,
            });
        });

        // ─── Disconnect ──────────────────────────────────────
        clientSocket.on('disconnect', () => {
            console.log(`❌ Client disconnected: ${clientSocket.id}`);
            const disconnectedStudent = studentService.getStudentBySocketId(clientSocket.id);
            if (disconnectedStudent) {
                studentService.removeBySocketId(clientSocket.id);
                // Notify ALL clients about updated participant list
                socketServer.emit('student:joined', {
                    students: studentService.getActiveStudents(),
                });
            }
        });
    });
};
