# Intervue LivePoll - Fullstack Setup

This is a live polling app I've been working on. It's got a teacher dashboard for creating polls and a student side for joining and voting in real-time. 

## What's actually in here?
* **Real-time updates:** Used Socket.io for the polls and chat. It handles the connections and room logic.
* **Teacher Flow:** You can create a poll, set a timer, and see who's joined. There's also a kick button if someone is being annoying.
* **Student Flow:** Just enter your name, wait for the poll to start, and vote.
* **Shared Types:** I moved the common interfaces into a `/shared` folder so the frontend and backend stay in sync.

## Some notes
* The timers are handled on the server side to keep everyone synced up.
* If you refresh the teacher dashboard, it should try to reconnect and find the active poll state.
* Chat is just basic for now - no persistence, just live messages.

Feel free to break stuff and see how it works.
