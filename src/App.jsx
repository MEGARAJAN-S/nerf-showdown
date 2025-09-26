import React, { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { ref, onValue, update, set } from "firebase/database";

function App() {
  const START_TIME = 450; // 7 minutes 30 seconds
  const [mode, setMode] = useState("2v2");
  const [scores, setScores] = useState({ A: [], B: [] });
  const [names, setNames] = useState({ A: [], B: [] });
  const [timeLeft, setTimeLeft] = useState(START_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [showScores, setShowScores] = useState(false); // Modal view
  const timerRef = useRef(null);

  const gameRef = ref(db, "games/nerf-wars");

  // Realtime DB listener
  useEffect(() => {
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val();

      if (data) {
        setMode(data.mode || "2v2");
        setScores(data.scores || { A: [0, 0], B: [0, 0] });
        setNames(
          data.names || { A: ["Player 1", "Player 2"], B: ["Player 1", "Player 2"] }
        );
        setTimeLeft(data.timeLeft ?? START_TIME);
        setIsRunning(data.isRunning ?? false);
      } else {
        const initialScores = { A: [0, 0], B: [0, 0] };
        const initialNames = { A: ["Player 1", "Player 2"], B: ["Player 1", "Player 2"] };
        set(gameRef, {
          mode: "2v2",
          scores: initialScores,
          names: initialNames,
          timeLeft: START_TIME,
          isRunning: false,
        });
        setMode("2v2");
        setScores(initialScores);
        setNames(initialNames);
        setTimeLeft(START_TIME);
        setIsRunning(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleModeChange = (newMode) => {
    const players = newMode === "2v2" ? 2 : 3;

    const updatedScores = {
      A: [...scores.A].slice(0, players),
      B: [...scores.B].slice(0, players),
    };
    const updatedNames = {
      A: [...names.A].slice(0, players),
      B: [...names.B].slice(0, players),
    };

    while (updatedScores.A.length < players) updatedScores.A.push(0);
    while (updatedScores.B.length < players) updatedScores.B.push(0);
    while (updatedNames.A.length < players)
      updatedNames.A.push(`Player ${updatedNames.A.length + 1}`);
    while (updatedNames.B.length < players)
      updatedNames.B.push(`Player ${updatedNames.B.length + 1}`);

    setMode(newMode);
    setScores(updatedScores);
    setNames(updatedNames);
    update(gameRef, { mode: newMode, scores: updatedScores, names: updatedNames });
  };

  useEffect(() => {
    if (isRunning) {
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 0) {
            clearInterval(timerRef.current);
            update(gameRef, { timeLeft: 0, isRunning: false });
            return 0;
          }
          const newTime = prev - 1;
          update(gameRef, { timeLeft: newTime });
          return newTime;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning]);

  const handleScoreChange = (team, idx, delta) => {
    const updated = [...scores[team]];
    updated[idx] = Math.max(0, updated[idx] + delta);
    const newScores = { ...scores, [team]: updated };
    setScores(newScores);
    update(gameRef, { scores: newScores });
  };

  const handleNameChange = (team, idx, newName) => {
    const updated = [...names[team]];
    updated[idx] = newName;
    const newNames = { ...names, [team]: updated };
    setNames(newNames);
    update(gameRef, { names: newNames });
  };

  const resetScores = () => {
    const reset = {
      A: scores.A.map(() => 0),
      B: scores.B.map(() => 0),
    };
    setScores(reset);
    update(gameRef, { scores: reset });
  };

  const resetTimer = () => {
    clearInterval(timerRef.current);
    setTimeLeft(START_TIME);
    setIsRunning(false);
    update(gameRef, { timeLeft: START_TIME, isRunning: false });
  };

  const formatTime = (seconds) =>
    `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  const teamTotal = (team) => scores[team]?.reduce((a, b) => a + b, 0) || 0;

  return (
    <div className="font-display min-h-screen bg-gradient-to-b from-black to-gray-900 text-white flex flex-col items-center py-8 px-4 relative">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-6 text-yellow-400 drop-shadow-lg">
        NERF SHOWDOWN: TEAM DUEL
      </h1>

      {/* Mode & View Score */}
      <div className="flex flex-wrap gap-4 mb-6 justify-center">
        <button
          onClick={() => handleModeChange("2v2")}
          className={`px-6 py-3 font-bold rounded-xl transition-colors duration-300 ${
            mode === "2v2" ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
          }`}
        >
          2v2
        </button>
        <button
          onClick={() => handleModeChange("3v3")}
          className={`px-6 py-3 font-bold rounded-xl transition-colors duration-300 ${
            mode === "3v3" ? "bg-red-500 hover:bg-red-600" : "bg-gray-700 hover:bg-gray-600"
          }`}
        >
          3v3
        </button>
        <button
          onClick={() => setShowScores(true)}
          className="px-6 py-3 font-bold rounded-xl bg-purple-500 hover:bg-purple-600 transition-transform transform hover:scale-105"
        >
          View Scores
        </button>
      </div>

      {/* Scoreboard */}
      <div className="flex flex-col md:flex-row justify-between w-full max-w-4xl gap-6 mb-6">
        <div className="flex-1 bg-gradient-to-br from-blue-800 to-blue-600 rounded-2xl p-6 shadow-lg text-center">
          <h2 className="text-2xl font-bold text-white mb-2">TEAM A</h2>
          <p className="text-5xl md:text-6xl font-extrabold text-cyan-300 mb-2">{teamTotal("A")}</p>
        </div>
        <div className="flex-1 bg-gradient-to-br from-red-800 to-red-600 rounded-2xl p-6 shadow-lg text-center">
          <h2 className="text-2xl font-bold text-white mb-2">TEAM B</h2>
          <p className="text-5xl md:text-6xl font-extrabold text-pink-300 mb-2">{teamTotal("B")}</p>
        </div>
      </div>

      {/* Timer */}
      <div className="text-yellow-400 text-4xl md:text-5xl font-extrabold mb-6 drop-shadow-lg">
        ⏱ {formatTime(timeLeft)}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 justify-center mb-6">
        <button
          onClick={() => {
            setIsRunning(!isRunning);
            update(gameRef, { isRunning: !isRunning });
          }}
          className="bg-green-500 hover:bg-green-600 px-6 py-3 font-bold rounded-xl shadow-lg transition-transform transform hover:scale-105"
        >
          {isRunning ? "Pause Match" : "Start/Resume Match"}
        </button>
        <button
          onClick={resetTimer}
          className="bg-yellow-500 hover:bg-yellow-600 px-6 py-3 font-bold rounded-xl shadow-lg transition-transform transform hover:scale-105"
        >
          Reset Timer
        </button>
        <button
          onClick={resetScores}
          className="bg-red-500 hover:bg-red-600 px-6 py-3 font-bold rounded-xl shadow-lg transition-transform transform hover:scale-105"
        >
          Reset Scores
        </button>
      </div>

      {/* Player Inputs */}
      <div className="flex flex-col md:flex-row gap-6 w-full max-w-5xl mb-6">
        {/* Team A */}
        <div className="flex-1 bg-blue-900 bg-opacity-70 p-4 md:p-6 rounded-2xl shadow-lg">
          <h3 className="text-cyan-300 font-bold text-xl mb-3">TEAM A</h3>
          {scores.A?.map((score, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2 mb-2">
              <input
                type="text"
                value={names.A[idx]}
                onChange={(e) => handleNameChange("A", idx, e.target.value)}
                className="bg-gray-800 text-white px-2 py-1 rounded-lg flex-1 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
              <button
                onClick={() => handleScoreChange("A", idx, -1)}
                className="bg-red-600 px-2 py-1 rounded-lg hover:bg-red-700 transition-colors"
              >
                -
              </button>
              <span className="w-10 text-center font-bold text-lg">{score}</span>
              <button
                onClick={() => handleScoreChange("A", idx, 1)}
                className="bg-green-600 px-2 py-1 rounded-lg hover:bg-green-700 transition-colors"
              >
                +
              </button>
            </div>
          ))}
        </div>

        {/* Team B */}
        <div className="flex-1 bg-red-900 bg-opacity-70 p-4 md:p-6 rounded-2xl shadow-lg">
          <h3 className="text-pink-300 font-bold text-xl mb-3">TEAM B</h3>
          {scores.B?.map((score, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2 mb-2">
              <input
                type="text"
                value={names.B[idx]}
                onChange={(e) => handleNameChange("B", idx, e.target.value)}
                className="bg-gray-800 text-white px-2 py-1 rounded-lg flex-1 focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
              <button
                onClick={() => handleScoreChange("B", idx, -1)}
                className="bg-red-600 px-2 py-1 rounded-lg hover:bg-red-700 transition-colors"
              >
                -
              </button>
              <span className="w-10 text-center font-bold text-lg">{score}</span>
              <button
                onClick={() => handleScoreChange("B", idx, 1)}
                className="bg-green-600 px-2 py-1 rounded-lg hover:bg-green-700 transition-colors"
              >
                +
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Overlay for Scores */}
      {showScores && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4 overflow-auto">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-2xl w-full relative">
            <button
              onClick={() => setShowScores(false)}
              className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-bold"
            >
              Close
            </button>
            <h3 className="text-yellow-400 text-2xl font-bold mb-4 text-center">Player Scores</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-cyan-300 font-semibold mb-2">TEAM A</h4>
                <ul>
                  {scores.A.map((score, idx) => (
                    <li
                      key={idx}
                      className="flex justify-between bg-blue-800 bg-opacity-60 p-2 rounded-lg mb-1"
                    >
                      <span>{names.A[idx]}</span>
                      <span>{score}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-pink-300 font-semibold mb-2">TEAM B</h4>
                <ul>
                  {scores.B.map((score, idx) => (
                    <li
                      key={idx}
                      className="flex justify-between bg-red-800 bg-opacity-60 p-2 rounded-lg mb-1"
                    >
                      <span>{names.B[idx]}</span>
                      <span>{score}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
