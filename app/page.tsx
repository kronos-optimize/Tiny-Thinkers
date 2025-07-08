"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Heart, Volume2, Eye, Brain, Home, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, VolumeX } from "lucide-react"

type Character = {
  id: string
  name: string
  emoji: string
  color: string
}

type GameStage =
  | "character-select"
  | "naming"
  | "sight-game"
  | "hearing-game"
  | "thinking-game"
  | "journey-complete"
  | "dog-help"
  | "maze-game"
  | "final-celebration"

type Position = {
  x: number
  y: number
}

const characters: Character[] = [
  { id: "cat", name: "Whiskers", emoji: "🐱", color: "bg-orange-400" },
  { id: "dog", name: "Buddy", emoji: "🐶", color: "bg-yellow-400" },
  { id: "robot", name: "Robo", emoji: "🤖", color: "bg-blue-400" },
  { id: "unicorn", name: "Sparkle", emoji: "🦄", color: "bg-pink-400" },
  { id: "dragon", name: "Flame", emoji: "🐲", color: "bg-green-400" },
  { id: "owl", name: "Hoot", emoji: "🦉", color: "bg-purple-400" },
]

const sightObjects = [
  { emoji: "🍎", name: "apple", wrongGuess: "banana" },
  { emoji: "🚗", name: "car", wrongGuess: "truck" },
  { emoji: "🌟", name: "star", wrongGuess: "moon" },
  { emoji: "🎈", name: "balloon", wrongGuess: "ball" },
  { emoji: "🌸", name: "flower", wrongGuess: "tree" },
]

const hearingSounds = [
  { emoji: "🐶", name: "dog barking", wrongGuess: "cat meowing" },
  { emoji: "🚁", name: "helicopter", wrongGuess: "airplane" },
  { emoji: "🌧️", name: "rain", wrongGuess: "wind" },
  { emoji: "🎵", name: "music", wrongGuess: "talking" },
  { emoji: "🔔", name: "bell", wrongGuess: "whistle" },
]

const thinkingPatterns = [
  { pattern: ["🔴", "🔵", "🔴", "🔵"], next: "red", wrongGuess: "yellow" },
  // Accept both "four stars" and "⭐⭐⭐⭐" as correct
  { pattern: ["⭐|  ", "⭐⭐|  ", "⭐⭐⭐|  "], next: ["four stars", "⭐⭐⭐⭐"], wrongGuess: "one star" },
  { pattern: ["🌙", "☀️", "🌙", "☀️"], next: "moon", wrongGuess: "star" },
  { pattern: ["🍎", "🍊", "🍎", "🍊"], next: "apple", wrongGuess: "banana" },
]

// Simple 6x6 maze layout (0 = path, 1 = wall)
const mazeLayout = [
  [0, 0, 1, 0, 0, 0],
  [1, 0, 1, 0, 1, 0],
  [0, 0, 0, 0, 1, 0],
  [0, 1, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 1],
  [1, 0, 0, 0, 0, 2], // 2 = home
]

// Audio Hook for managing sounds
function useAudio() {
  const [isMuted, setIsMuted] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      } catch (error) {
        console.log("Audio context not supported")
      }
    }
  }, [])

  // Generate sound using Web Audio API
  const playTone = (frequency: number, duration: number, type: OscillatorType = "sine") => {
    if (isMuted || !audioContextRef.current) return

    try {
      const oscillator = audioContextRef.current.createOscillator()
      const gainNode = audioContextRef.current.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContextRef.current.destination)

      oscillator.frequency.value = frequency
      oscillator.type = type

      gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration)

      oscillator.start(audioContextRef.current.currentTime)
      oscillator.stop(audioContextRef.current.currentTime + duration)
    } catch (error) {
      console.log("Error:", error)
    }
  }

  // Play real audio files for hearing-game
  const playRealSound = (soundType: string) => {
    if (isMuted) return
    let file = ""
    switch (soundType) {
      case "dog barking":
        file = "/sounds/dog-barking.mp3"
        break
      case "helicopter":
        file = "/sounds/helicopter.mp3"
        break
      case "rain":
        file = "/sounds/rain.mp3"
        break
      case "music":
        file = "/sounds/music.mp3"
        break
      case "bell":
        file = "/sounds/bell.mp3"
        break
      default:
        return
    }
    const audioEl = new window.Audio(file)
    audioEl.volume = 0.8
    audioEl.play()
  }

  // Sound effects
  const playCorrectSound = () => {
    playTone(523, 0.2) // C note
    setTimeout(() => playTone(659, 0.2), 100) // E note
    setTimeout(() => playTone(784, 0.3), 200) // G note
  }

  const playIncorrectSound = () => {
    playTone(200, 0.5, "sawtooth")
  }

  const playClickSound = () => {
    playTone(800, 0.1, "square")
  }

  const playCelebrationSound = () => {
    const notes = [523, 659, 784, 1047] // C, E, G, C
    notes.forEach((note, index) => {
      setTimeout(() => playTone(note, 0.3), index * 150)
    })
  }

  const playMoveSound = () => {
    playTone(400, 0.1, "triangle")
  }

  // Enhanced text-to-speech with more enthusiasm
  const speak = (text: string, options: { rate?: number; pitch?: number; volume?: number } = {}) => {
    if (isMuted || typeof window === "undefined" || !window.speechSynthesis) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)

    // Make voice more enthusiastic and kid-friendly
    utterance.rate = options.rate || 1.1 // Slightly faster for excitement
    utterance.pitch = options.pitch || 1.4 // Higher pitch for enthusiasm
    utterance.volume = options.volume || 0.8

    // Try to use a more cheerful voice if available
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(
      (voice) => voice.name.includes("Google") || voice.name.includes("Microsoft") || voice.lang.includes("en-US"),
    )
    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    window.speechSynthesis.speak(utterance)
  }

  // Improved hearing sound effects with distinct sounds
  const playHearingSound = (soundType: string) => {
    if (isMuted || !audioContextRef.current) return

    try {
      switch (soundType) {
        case "dog barking":
          // More realistic dog barking with multiple quick barks
          const barkTimes = [0, 300, 600, 900]
          barkTimes.forEach((time) => {
            setTimeout(() => {
              // Sharp, quick barks with varying pitch
              playTone(180, 0.08, "sawtooth")
              setTimeout(() => playTone(220, 0.06, "sawtooth"), 40)
            }, time)
          })
          break

        case "helicopter":
          // Realistic helicopter sound with rotating blade effect
          let helicopterTime = 0
          const helicopterInterval = setInterval(() => {
            const frequency = 80 + Math.sin(helicopterTime * 0.3) * 15
            playTone(frequency, 0.1, "sawtooth")
            helicopterTime += 0.1
          }, 50)
          setTimeout(() => clearInterval(helicopterInterval), 2000)
          break

        case "rain":
          // Realistic rain sound with random droplets
          for (let i = 0; i < 50; i++) {
            setTimeout(() => {
              const frequency = 1200 + Math.random() * 800
              playTone(frequency, 0.03, "square")
            }, Math.random() * 2000)
          }
          break

        case "music":
          // Happy melody that sounds musical
          const musicNotes = [
            { freq: 523, time: 0 }, // C
            { freq: 587, time: 300 }, // D
            { freq: 659, time: 600 }, // E
            { freq: 523, time: 900 }, // C
            { freq: 784, time: 1200 }, // G
            { freq: 659, time: 1500 }, // E
          ]
          musicNotes.forEach(({ freq, time }) => {
            setTimeout(() => playTone(freq, 0.25, "sine"), time)
          })
          break

        case "bell":
          // Church bell-like sound with resonance
          playTone(400, 1.0, "sine")
          setTimeout(() => playTone(800, 0.8, "sine"), 100)
          setTimeout(() => playTone(400, 0.6, "sine"), 800)
          setTimeout(() => playTone(800, 0.4, "sine"), 1200)
          break

        default:
          playTone(440, 0.5)
      }
    } catch (error) {
      console.log("Error playing hearing sound:", error)
    }
  }

  return {
    isMuted,
    setIsMuted,
    playCorrectSound,
    playIncorrectSound,
    playClickSound,
    playCelebrationSound,
    playMoveSound,
    playHearingSound,
    playRealSound, // <-- add this
    speak,
    playTone, // <-- fix: expose playTone
  }
}

// Speech Bubble Component
function SpeechBubble({ children, isVisible }: { children: React.ReactNode; isVisible: boolean }) {
  if (!isVisible) return null

  return (
    <div className="relative bg-white border-4 border-blue-400 rounded-3xl p-4 mb-4 shadow-lg animate-bounce">
      <div className="text-lg font-bold text-gray-800">{children}</div>
      <div className="absolute bottom-[-12px] left-8 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[12px] border-l-transparent border-r-transparent border-t-blue-400"></div>
    </div>
  )
}

// Volume Control Component
function VolumeControl({ isMuted, onToggle }: { isMuted: boolean; onToggle: () => void }) {
  return (
    <Button
      onClick={onToggle}
      className="fixed top-4 right-4 bg-white/80 hover:bg-white text-gray-700 p-3 rounded-full shadow-lg z-50"
      size="sm"
    >
      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
    </Button>
  )
}

// Maze Component
function MazeGame({
  characterName,
  selectedCharacter,
  onComplete,
  audio,
}: {
  characterName: string
  selectedCharacter: Character | null
  onComplete: () => void
  audio: ReturnType<typeof useAudio>
}) {
  const [dogPosition, setDogPosition] = useState<Position>({ x: 0, y: 0 })
  const [moves, setMoves] = useState(0)
  const [showHint, setShowHint] = useState(false)

  const moveDog = (direction: "up" | "down" | "left" | "right") => {
    audio.playMoveSound()

    setDogPosition((prev) => {
      let newX = prev.x
      let newY = prev.y

      switch (direction) {
        case "up":
          newY = Math.max(0, prev.y - 1)
          break
        case "down":
          newY = Math.min(5, prev.y + 1)
          break
        case "left":
          newX = Math.max(0, prev.x - 1)
          break
        case "right":
          newX = Math.min(5, prev.x + 1)
          break
      }

      // Check if new position is valid (not a wall)
      if (mazeLayout[newY][newX] === 1) {
        audio.playIncorrectSound()
        return prev // Don't move if it's a wall
      }

      const newPosition = { x: newX, y: newY }
      setMoves((m) => m + 1)

      // Check if reached home
      if (mazeLayout[newY][newX] === 2) {
        audio.playCelebrationSound()
        setTimeout(() => {
          audio.speak("Hooray! The dog made it home safely! What an amazing rescue!", {
            rate: 1.2,
            pitch: 1.5,
          })
        }, 500)
        setTimeout(onComplete, 1000)
      }

      return newPosition
    })
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHint(true)
      audio.speak("Use the arrows to help guide the dog home! I can see the path clearly!", {
        rate: 1.1,
        pitch: 1.3,
      })
    }, 3000)
    return () => clearTimeout(timer)
  }, [audio])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        moveDog("up");
        e.preventDefault();
      } else if (e.key === "ArrowDown") {
        moveDog("down");
        e.preventDefault();
      } else if (e.key === "ArrowLeft") {
        moveDog("left");
        e.preventDefault();
      } else if (e.key === "ArrowRight") {
        moveDog("right");
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="text-center">
      <div className="flex justify-center items-center gap-4 mb-6">
        <div className="text-4xl">{selectedCharacter?.emoji}</div>
        <SpeechBubble isVisible={showHint}>
          Use the arrows to help guide the dog home! I can see the path! 🗺️
        </SpeechBubble>
      </div>

      <div className="bg-white p-6 rounded-3xl border-4 border-green-400 mb-6 inline-block">
        <div className="grid grid-cols-6 gap-1 mb-4">
          {mazeLayout.map((row, y) =>
            row.map((cell, x) => (
              <div
                key={`${x}-${y}`}
                className={`w-12 h-12 border-2 border-gray-300 flex items-center justify-center text-2xl ${
                  cell === 1
                    ? "bg-gray-800" // Wall
                    : cell === 2
                      ? "bg-yellow-400" // Home
                      : "bg-green-100" // Path
                }`}
              >
                {dogPosition.x === x && dogPosition.y === y && "🐕"}
                {cell === 2 && dogPosition.x !== x && dogPosition.y !== y && "🏠"}
              </div>
            )),
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto mb-4">
        <div></div>
        <Button onClick={() => moveDog("up")} className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-xl">
          <ArrowUp className="w-6 h-6" />
        </Button>
        <div></div>

        <Button onClick={() => moveDog("left")} className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-xl">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="flex items-center justify-center">
          <span className="text-lg font-bold">Moves: {moves}</span>
        </div>
        <Button onClick={() => moveDog("right")} className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-xl">
          <ArrowRight className="w-6 h-6" />
        </Button>

        <div></div>
        <Button onClick={() => moveDog("down")} className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-xl">
          <ArrowDown className="w-6 h-6" />
        </Button>
        <div></div>
      </div>
    </div>
  )
}

// Add a new informative intro page before character select
function IntroPage({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-yellow-400 p-4 flex items-center justify-center">
      <Card className="bg-white p-12 rounded-3xl shadow-2xl border-4 border-blue-400 max-w-2xl w-full">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-purple-700 mb-8 drop-shadow-lg">Welcome to Tiny Thinkers!</h1>
          <p className="text-2xl text-gray-700 mb-8">
            Your AI friend cannot see, hear, or think yet.<br /><br />
            <span className="font-bold text-pink-600">They need your help!</span><br /><br />
            Play fun games to help your AI friend <span className="font-bold text-blue-600">see</span>, <span className="font-bold text-green-600">hear</span>, and <span className="font-bold text-purple-600">think</span>.<br /><br />
            Guide them through each challenge and watch them grow!
          </p>
          <Button
            onClick={onContinue}
            className="bg-gradient-to-r from-purple-400 to-pink-500 text-white text-2xl font-bold py-4 px-8 rounded-xl hover:scale-105 transition-transform"
          >
            Start the Adventure!
          </Button>
        </div>
      </Card>
    </div>
  )
}

// Utility to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export default function TinyThinkersGame() {
  // Add intro page state
  const [showIntro, setShowIntro] = useState(true)
  const [gameStage, setGameStage] = useState<GameStage>("character-select")
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const [characterName, setCharacterName] = useState("")
  const [currentRound, setCurrentRound] = useState(0)
  const [showCorrection, setShowCorrection] = useState(false)
  const [gameProgress, setGameProgress] = useState({ sight: false, hearing: false, thinking: false })
  const [userAnswer, setUserAnswer] = useState("")
  const [isGuessing, setIsGuessing] = useState(false)
  const [guessingPhase, setGuessingPhase] = useState<"thinking" | "guessing" | "done">("thinking")
  const [showSpeechBubble, setShowSpeechBubble] = useState(false)
  // Add this state to store the 3 sight questions for the session
  const [sightQuestions, setSightQuestions] = useState(() => shuffleArray(sightObjects).slice(0, 3))
  const [hearingQuestions, setHearingQuestions] = useState(() => shuffleArray(hearingSounds).slice(0, 3))
  const [thinkingQuestions, setThinkingQuestions] = useState(() => shuffleArray(thinkingPatterns).slice(0, 3))

  const audio = useAudio()

  useEffect(() => {
    if (gameStage === "journey-complete") {
      setTimeout(() => {
        audio.speak("Wow, what an incredible journey! Thank you so much for guiding me and teaching me everything!", {
          rate: 1.1,
          pitch: 1.4,
        })
      }, 500)
    }

    if (gameStage === "final-celebration") {
      audio.playCelebrationSound()
      setTimeout(() => {
        audio.speak(
          "Mission accomplished! Thanks to your incredible training, I successfully helped the lost dog find its way home! You're the best teacher ever!",
          {
            rate: 1.1,
            pitch: 1.4,
          },
        )
      }, 1000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStage, audio])

  const handleCharacterSelect = (character: Character) => {
    audio.playClickSound()
    setTimeout(() => {
      audio.speak(`Awesome choice! You selected ${character.name}! Let's be best friends!`, {
        rate: 1.2,
        pitch: 1.4,
      })
    }, 200)
    setSelectedCharacter(character)
    setCharacterName(character.name)
    setGameStage("naming")
  }

  const startSightGame = () => {
    audio.playClickSound()
    setSightQuestions(shuffleArray(sightObjects).slice(0, 3)) // Only shuffle once per game start
    setTimeout(() => {
      audio.speak(`Fantastic! Let's start training ${characterName} to see! This is going to be so much fun!`, {
        rate: 1.1,
        pitch: 1.3,
      })
    }, 200)
    setGameStage("sight-game")
    setCurrentRound(0)
    setShowCorrection(false)
    setUserAnswer("")
    startGuessingSequence()
  }

  const startGuessingSequence = (gameType?: "sight" | "hearing" | "thinking") => {
    setIsGuessing(true)
    setGuessingPhase("thinking")
    setShowSpeechBubble(true)

    // Thinking phase
    setTimeout(() => {
      setGuessingPhase("guessing")
      // Add thinking sound
      audio.playTone?.(300, 0.5, "triangle")
      // Trigger AI guess speech after guessing phase is set
      setTimeout(() => {
        let wrongGuess = ""
        if (gameType === "sight") {
          wrongGuess = `I think this is a ${sightQuestions[currentRound].wrongGuess}!`
        } else if (gameType === "hearing") {
          wrongGuess = `I think this sound is ${hearingQuestions[currentRound].wrongGuess}!`
        } else if (gameType === "thinking") {
          wrongGuess = `I think the next item is ${thinkingQuestions[currentRound].wrongGuess}!`
        }
        if (wrongGuess) {
          audio.speak(wrongGuess, { rate: 1.0, pitch: 1.2 })
        }
      }, 500)
    }, 2000)

    // Guessing phase
    setTimeout(() => {
      setGuessingPhase("done")
      setIsGuessing(false)
    }, 4000)
  }

  const checkAnswer = (selected: string, gameType: "sight" | "hearing" | "thinking") => {
    let correctAnswer: string | string[]
    if (gameType === "sight") {
      correctAnswer = sightQuestions[currentRound].name
    } else if (gameType === "hearing") {
      correctAnswer = hearingQuestions[currentRound].name
    } else {
      correctAnswer = thinkingQuestions[currentRound].next
    }
    // Only accept exact match or, for array, any exact match
    const isCorrect = Array.isArray(correctAnswer)
      ? correctAnswer.includes(selected)
      : selected === correctAnswer
    if (isCorrect) {
      audio.playCorrectSound()
      setTimeout(() => {
        audio.speak(`Yes! Exactly right! It's a ${Array.isArray(correctAnswer) ? correctAnswer[0] : correctAnswer}! You're such a great teacher!`, {
          rate: 1.2,
          pitch: 1.4,
        })
      }, 300)
      setShowCorrection(true)
      setTimeout(() => {
        if (currentRound < (gameType === "sight" ? sightQuestions.length - 1 : hearingQuestions.length - 1)) {
          setCurrentRound(currentRound + 1)
          setShowCorrection(false)
          setUserAnswer("")
          startGuessingSequence(gameType)
        } else {
          // Complete this training phase
          setGameProgress((prev) => ({ ...prev, [gameType]: true }))
          audio.playCelebrationSound()
          setTimeout(() => {
            if (gameType === "sight") {
              audio.speak(`Incredible! ${characterName} can now see perfectly! Let's teach them to hear sounds!`, {
                rate: 1.1,
                pitch: 1.4,
              })
              setTimeout(() => {
                startHearingGame()
              }, 5000) // 5 second pause before next section
            } else if (gameType === "hearing") {
              audio.speak(`Amazing work! ${characterName} can now hear everything! Time to teach them to think!`, {
                rate: 1.1,
                pitch: 1.4,
              })
              setTimeout(() => {
                startThinkingGame()
              }, 5000) // 5 second pause before next section
            } else if (gameType === "thinking") {
              audio.speak(`Outstanding! ${characterName} can now think logically! What a smart AI friend!`, {
                rate: 1.1,
                pitch: 1.4,
              })
              setGameStage("journey-complete")
            }
          }, 4000)
        }
      }, 4000)
    } else {
      audio.playIncorrectSound()
      // Optional: Show a gentle hint if the answer is wrong
    }
  }

  const getSpeechBubbleText = (gameType: "sight" | "hearing" | "thinking") => {
    if (guessingPhase === "thinking") {
      return "Hmm... let me think... 🤔"
    }

    if (guessingPhase === "guessing") {
      if (gameType === "sight") {
        return `I think this is a ${sightQuestions[currentRound].wrongGuess}!`
      } else if (gameType === "hearing") {
        return `I think this sound is ${hearingQuestions[currentRound].wrongGuess}!`
      } else {
        return `I think the next item is ${thinkingQuestions[currentRound].wrongGuess}!`
      }
    }

    return ""
  }

  const playHelpSoundEffect = () => {
    audio.playRealSound("dog barking") // Play the real dog barking sound
    setTimeout(() => audio.playHearingSound("dog barking"), 1000)
    setTimeout(() => {
      audio.speak("Oh my! I can hear someone crying for help! Let me use my amazing new abilities to find them!", {
        rate: 1.1,
        pitch: 1.4,
      })
    }, 3000)
  }

  // Show intro page first
  if (showIntro) {
    return <IntroPage onContinue={() => setShowIntro(false)} />
  }

  if (gameStage === "character-select") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-yellow-400 p-4">
        <VolumeControl isMuted={audio.isMuted} onToggle={() => audio.setIsMuted(!audio.isMuted)} />
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-6xl font-bold text-white mb-4 drop-shadow-lg">🧠 Tiny Thinkers 🧠</h1>
            <p className="text-2xl text-white font-semibold drop-shadow">Choose your AI friend to train!</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {characters.map((character) => (
              <Card
                key={character.id}
                className={`${character.color} p-6 cursor-pointer transform hover:scale-105 transition-all duration-300 hover:shadow-2xl border-4 border-white`}
                onClick={() => handleCharacterSelect(character)}
              >
                <div className="text-center">
                  <div className="text-8xl mb-4">{character.emoji}</div>
                  <h3 className="text-2xl font-bold text-white drop-shadow">{character.name}</h3>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (gameStage === "naming") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 p-4 flex items-center justify-center">
        <VolumeControl isMuted={audio.isMuted} onToggle={() => audio.setIsMuted(!audio.isMuted)} />
        <Card className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-yellow-400 max-w-md w-full">
          <div className="text-center">
            <div className="text-8xl mb-6">{selectedCharacter?.emoji}</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Name your AI friend!</h2>
            <Input
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              className="text-2xl text-center font-bold border-4 border-blue-300 rounded-xl mb-6 p-4"
              placeholder="Enter a name..."
            />
            <Button
              onClick={startSightGame}
              className="bg-gradient-to-r from-green-400 to-blue-500 text-white text-xl font-bold py-4 px-8 rounded-xl hover:scale-105 transition-transform"
              disabled={!characterName.trim()}
            >
              Start Training! 🚀
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (gameStage === "sight-game") {
    const currentObject = sightQuestions[currentRound]
    const totalQuestions = sightQuestions.length

    // Prepare 4 choices: correct, wrong, and 2 random other (not correct/wrong)
    const otherNames = sightQuestions
      .map((obj) => obj.name)
      .filter((name) => name !== currentObject.name && name !== currentObject.wrongGuess)
    const distractors = shuffleArray(otherNames).slice(0, 2)
    const choices = shuffleArray([
      { label: currentObject.name.charAt(0).toUpperCase() + currentObject.name.slice(1), value: currentObject.name },
      { label: currentObject.wrongGuess.charAt(0).toUpperCase() + currentObject.wrongGuess.slice(1), value: currentObject.wrongGuess },
      ...distractors.map((d) => ({ label: d.charAt(0).toUpperCase() + d.slice(1), value: d })),
    ])

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-400 to-purple-400 p-4">
        <VolumeControl isMuted={audio.isMuted} onToggle={() => audio.setIsMuted(!audio.isMuted)} />
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">👁️ Teaching {characterName} to See! 👁️</h1>
            <div className="flex justify-center items-center gap-4 mb-6">
              <div className="text-6xl">{selectedCharacter?.emoji}</div>
              <div className="text-4xl">👀</div>
            </div>
            <div className="text-lg font-bold text-white mb-2">
              Question {currentRound + 1} of {totalQuestions}
            </div>
          </div>
          <Card className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-yellow-400 mb-6">
            <div className="text-center">
              <div className="text-9xl mb-6">{currentObject.emoji}</div>

              {/* Speech Bubble */}
              <div className="flex justify-center mb-6">
                <SpeechBubble isVisible={showSpeechBubble && (isGuessing || guessingPhase === "done")}>
                  {getSpeechBubbleText("sight")}
                </SpeechBubble>
              </div>

              {!showCorrection && !isGuessing && guessingPhase === "done" ? (
                <div>
                  <div className="bg-red-100 border-4 border-red-400 rounded-xl p-4 mb-6">
                    <p className="text-2xl font-bold text-red-600">
                      {characterName} guessed: "{currentObject.wrongGuess}" ❌
                    </p>
                  </div>
                  <p className="text-xl text-gray-700 mb-4">Help {characterName} learn! What is this really?</p>
                  <div className="flex flex-col gap-4 items-center">
                    {/* 2x2 grid for choices */}
                    <div className="grid grid-cols-2 gap-4">
                      {choices.map((choice, idx) => (
                        <Button
                          key={idx}
                          onClick={() => checkAnswer(choice.value, "sight")}
                          className="bg-gradient-to-r from-green-400 to-blue-500 text-white text-xl font-bold py-3 px-6 rounded-xl hover:scale-105 transition-transform"
                        >
                          {choice.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : showCorrection ? (
                <div className="bg-green-100 border-4 border-green-400 rounded-xl p-6">
                  <p className="text-2xl font-bold text-green-600 mb-4">
                    Thank you! Now I know it's a {currentObject.name}! 🎉
                  </p>
                  <div className="flex justify-center">
                    <Heart className="text-red-500 w-8 h-8 animate-pulse" />
                  </div>
                </div>
              ) : (
                <div className="text-xl text-gray-600">{characterName} is looking at the object...</div>
              )}
            </div>
          </Card>

          {gameProgress.sight && (
            <Card className="bg-gradient-to-r from-yellow-400 to-orange-400 p-6 rounded-3xl border-4 border-white">
              <div className="text-center">
                <Eye className="w-16 h-16 mx-auto mb-4 text-white" />
                <h2 className="text-3xl font-bold text-white">🎉 {characterName} can now see! 🎉</h2>
              </div>
            </Card>
          )}
        </div>
      </div>
    )
  }

  if (gameStage === "hearing-game") {
    const currentSound = hearingQuestions[currentRound]
    const totalQuestions = hearingQuestions.length

    // Prepare 4 choices: correct, wrong, and 2 random other (not correct/wrong)
    const otherNames = hearingQuestions
      .map((obj) => obj.name)
      .filter((name) => name !== currentSound.name && name !== currentSound.wrongGuess)
    const distractors = shuffleArray(otherNames).slice(0, 2)
    const choices = shuffleArray([
      { label: currentSound.name.charAt(0).toUpperCase() + currentSound.name.slice(1), value: currentSound.name },
      { label: currentSound.wrongGuess.charAt(0).toUpperCase() + currentSound.wrongGuess.slice(1), value: currentSound.wrongGuess },
      ...distractors.map((d) => ({ label: d.charAt(0).toUpperCase() + d.slice(1), value: d })),
    ])

    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-400 to-blue-400 p-4">
        <VolumeControl isMuted={audio.isMuted} onToggle={() => audio.setIsMuted(!audio.isMuted)} />
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
              👂 Teaching {characterName} to Hear! 👂
            </h1>
            <div className="flex justify-center items-center gap-4 mb-6">
              <div className="text-6xl">{selectedCharacter?.emoji}</div>
              <Volume2 className="w-12 h-12 text-white animate-pulse" />
            </div>
            <div className="text-lg font-bold text-white mb-2">
              Question {currentRound + 1} of {totalQuestions}
            </div>
          </div>
          <Card className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-pink-400 mb-6">
            <div className="text-center">
              <div className="text-9xl mb-6">{currentSound.emoji}</div>

              {/* Play Sound Button */}
              <Button
                onClick={() => {
                  audio.playRealSound(currentSound.name)
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white text-lg font-bold py-3 px-6 rounded-xl mb-6"
              >
                🔊 Play Sound
              </Button>

              {/* Speech Bubble */}
              <div className="flex justify-center mb-6">
                <SpeechBubble isVisible={showSpeechBubble && (isGuessing || guessingPhase === "done")}>
                  {getSpeechBubbleText("hearing")}
                </SpeechBubble>
              </div>
              {!showCorrection && !isGuessing && guessingPhase === "done" ? (
                <div>
                  <div className="bg-red-100 border-4 border-red-400 rounded-xl p-4 mb-6">
                    <p className="text-2xl font-bold text-red-600">
                      {characterName} guessed: "{currentSound.wrongGuess}" ❌
                    </p>
                  </div>
                  <p className="text-xl text-gray-700 mb-4">Help {characterName} learn! What sound is this?</p>
                  <div className="flex flex-col gap-4 items-center">
                    {/* 2x2 grid for choices */}
                    <div className="grid grid-cols-2 gap-4">
                      {choices.map((choice, idx) => (
                        <Button
                          key={idx}
                          onClick={() => checkAnswer(choice.value, "hearing")}
                          className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xl font-bold py-3 px-6 rounded-xl hover:scale-105 transition-transform"
                        >
                          {choice.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : showCorrection ? (
                <div className="bg-green-100 border-4 border-green-400 rounded-xl p-6">
                  <p className="text-2xl font-bold text-green-600 mb-4">
                    Thank you! Now I can hear {currentSound.name}! 🎉
                  </p>
                  <div className="flex justify-center">
                    <Heart className="text-red-500 w-8 h-8 animate-pulse" />
                  </div>
                </div>
              ) : (
                <div className="text-xl text-gray-600">{characterName} is listening to the sound...</div>
              )}
            </div>
          </Card>

          {gameProgress.hearing && (
            <Card className="bg-gradient-to-r from-pink-400 to-purple-400 p-6 rounded-3xl border-4 border-white">
              <div className="text-center">
                <Volume2 className="w-16 h-16 mx-auto mb-4 text-white" />
                <h2 className="text-3xl font-bold text-white">🎉 {characterName} can now hear! 🎉</h2>
              </div>
            </Card>
          )}
        </div>
      </div>
    )
  }

  if (gameStage === "thinking-game") {
    const currentPattern = thinkingQuestions[currentRound]
    const totalQuestions = thinkingQuestions.length

    // Prepare 4 choices: correct, wrong, and 2 random other (not correct/wrong)
    let allAnswers: string[] = []
    if (Array.isArray(currentPattern.next)) {
      allAnswers = [
        ...currentPattern.next,
        currentPattern.wrongGuess,
        ...thinkingQuestions
          .map((p) => (Array.isArray(p.next) ? p.next : [p.next]))
          .flat()
          .filter(
            (ans) =>
              !(currentPattern.next as string[]).includes(ans) &&
              ans !== currentPattern.wrongGuess
          ),
      ]
    } else {
      allAnswers = [
        currentPattern.next as string,
        currentPattern.wrongGuess,
        ...thinkingQuestions
          .map((p) => (Array.isArray(p.next) ? p.next : [p.next]))
          .flat()
          .filter(
            (ans) =>
              ans !== currentPattern.next &&
              ans !== currentPattern.wrongGuess
          ),
      ]
    }
    const distractors = shuffleArray(
      allAnswers.filter(
        (ans) =>
          (Array.isArray(currentPattern.next)
            ? !(currentPattern.next as string[]).includes(ans)
            : ans !== currentPattern.next) &&
          ans !== currentPattern.wrongGuess
      )
    ).slice(0, 2)

    // For display, show both emoji and text for "four stars"
    let correctChoices: { label: string; value: string }[] = []
    if (Array.isArray(currentPattern.next)) {
      correctChoices = [
        { label: "⭐⭐⭐⭐ (Four stars)", value: "⭐⭐⭐⭐" },
        { label: "Four stars", value: "four stars" },
      ]
    } else {
      correctChoices = [
        {
          label:
            (currentPattern.next as string).charAt(0).toUpperCase() +
            (currentPattern.next as string).slice(1),
          value: currentPattern.next as string,
        },
      ]
    }
    const wrongChoice = {
      label:
        currentPattern.wrongGuess.charAt(0).toUpperCase() +
        currentPattern.wrongGuess.slice(1),
      value: currentPattern.wrongGuess,
    }
    const distractorChoices = distractors.map((d) => ({
      label: d.charAt(0).toUpperCase() + d.slice(1),
      value: d,
    }))
    // Always 1 correct, 1 wrong, 2 distractors, shuffled
    const choices = shuffleArray([
      ...correctChoices.slice(0, 1), // only one correct per question
      wrongChoice,
      ...distractorChoices.slice(0, 2),
    ])

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 p-4">
        <VolumeControl isMuted={audio.isMuted} onToggle={() => audio.setIsMuted(!audio.isMuted)} />
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
              🧠 Teaching {characterName} to Think! 🧠
            </h1>
            <div className="flex justify-center items-center gap-4 mb-6">
              <div className="text-6xl">{selectedCharacter?.emoji}</div>
              <Brain className="w-12 h-12 text-white animate-pulse" />
            </div>
            <div className="text-lg font-bold text-white mb-2">
              Question {currentRound + 1} of {totalQuestions}
            </div>
          </div>
          <Card className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-indigo-400 mb-6">
            <div className="text-center">
              <div className="mb-6">
                <p className="text-xl font-bold text-gray-700 mb-4">Pattern:</p>
                <div className="flex justify-center gap-4 text-4xl mb-6">
                  {currentPattern.pattern.map((item, index) => (
                    <span key={index}>{item}</span>
                  ))}
                  <span className="text-gray-400">?</span>
                </div>
              </div>

              {/* Speech Bubble */}
              <div className="flex justify-center mb-6">
                <SpeechBubble isVisible={showSpeechBubble && (isGuessing || guessingPhase === "done")}>
                  {getSpeechBubbleText("thinking")}
                </SpeechBubble>
              </div>
              {!showCorrection && !isGuessing && guessingPhase === "done" ? (
                <div>
                  <div className="bg-red-100 border-4 border-red-400 rounded-xl p-4 mb-6">
                    <p className="text-2xl font-bold text-red-600">
                      {characterName} guessed: "{currentPattern.wrongGuess}" ❌
                    </p>
                  </div>
                  <p className="text-xl text-gray-700 mb-4">Help {characterName} think! What comes next?</p>
                  <div className="flex flex-col gap-4 items-center">
                    {/* 2x2 grid for choices */}
                    <div className="grid grid-cols-2 gap-4">
                      {choices.map((choice, idx) => (
                        <Button
                          key={idx}
                          onClick={() => checkAnswer(choice.value, "thinking")}
                          className="bg-gradient-to-r from-indigo-400 to-purple-500 text-white text-xl font-bold py-3 px-6 rounded-xl hover:scale-105 transition-transform"
                        >
                          {choice.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : showCorrection ? (
                <div className="bg-green-100 border-4 border-green-400 rounded-xl p-6">
                  <p className="text-2xl font-bold text-green-600 mb-4">Thank you! Now I understand the pattern! 🎉</p>
                  <div className="flex justify-center">
                    <Heart className="text-red-500 w-8 h-8 animate-pulse" />
                  </div>
                </div>
              ) : (
                <div className="text-xl text-gray-600">{characterName} is analyzing the pattern...</div>
              )}
            </div>
          </Card>

          {gameProgress.thinking && (
            <Card className="bg-gradient-to-r from-indigo-400 to-purple-400 p-6 rounded-3xl border-4 border-white">
              <div className="text-center">
                <Brain className="w-16 h-16 mx-auto mb-4 text-white" />
                <h2 className="text-3xl font-bold text-white">🎉 {characterName} can now think! 🎉</h2>
              </div>
            </Card>
          )}
        </div>
      </div>
    )
  }

  if (gameStage === "journey-complete") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-yellow-400 p-4 flex items-center justify-center">
        <VolumeControl isMuted={audio.isMuted} onToggle={() => audio.setIsMuted(!audio.isMuted)} />
        <Card className="bg-white p-12 rounded-3xl shadow-2xl border-4 border-yellow-400 max-w-2xl w-full">
          <div className="text-center">
            <div className="text-9xl mb-8">{selectedCharacter?.emoji}</div>
            <h1 className="text-4xl font-bold text-gray-800 mb-8">"Wow, what a journey! Thank you for guiding me!"</h1>
            <div className="flex justify-center gap-6 mb-8">
              <div className="flex flex-col items-center">
                <Eye className="w-12 h-12 text-green-500 mb-2" />
                <span className="text-lg font-bold text-green-600">I can see!</span>
              </div>
              <div className="flex flex-col items-center">
                <Volume2 className="w-12 h-12 text-blue-500 mb-2" />
                <span className="text-lg font-bold text-blue-600">I can hear!</span>
              </div>
              <div className="flex flex-col items-center">
                <Brain className="w-12 h-12 text-purple-500 mb-2" />
                <span className="text-lg font-bold text-purple-600">I can think!</span>
              </div>
            </div>
            <p className="text-xl text-gray-700 mb-8">
              Thanks to your training, I now have all the abilities I need to help others!
            </p>
            <Button
              onClick={() => {
                audio.playClickSound()
                setTimeout(() => {
                  audio.speak("Let's continue our adventure and help someone in need!", {
                    rate: 1.2,
                    pitch: 1.4,
                  })
                  setGameStage("dog-help")
                }, 300)
              }}
              className="bg-gradient-to-r from-green-400 to-blue-500 text-white text-2xl font-bold py-4 px-8 rounded-xl hover:scale-105 transition-transform"
            >
              Continue the Adventure! ✨
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (gameStage === "dog-help") {
    playHelpSoundEffect()

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-400 via-red-400 to-pink-400 p-4 flex items-center justify-center">
        <VolumeControl isMuted={audio.isMuted} onToggle={() => audio.setIsMuted(!audio.isMuted)} />
        <Card className="bg-white p-12 rounded-3xl shadow-2xl border-4 border-red-400 max-w-2xl w-full">
          <div className="text-center">
            <div className="mb-8">
              <Volume2 className="w-16 h-16 mx-auto mb-4 text-red-500 animate-pulse" />
              <h1 className="text-4xl font-bold text-red-600 mb-6">🆘 "Help! Help!" 🆘</h1>
            </div>

            <div className="text-8xl mb-6">🐕</div>

            <div className="bg-yellow-100 border-4 border-yellow-400 rounded-xl p-6 mb-8">
              <div className="flex justify-center items-center gap-4 mb-4">
                <div className="text-4xl">{selectedCharacter?.emoji}</div>
                <SpeechBubble isVisible={true}>
                  I can hear someone crying for help! Let me use my new abilities to find them!
                </SpeechBubble>
              </div>
            </div>

            <h2 className="text-3xl font-bold text-gray-800 mb-4">A Lost Dog Needs Help!</h2>
            <p className="text-xl text-gray-700 mb-8">
              {characterName} can now hear the dog's cries, see that it's lost, and think of how to help!
            </p>

            <Button
              onClick={() => {
                audio.playClickSound()
                setTimeout(() => {
                  audio.speak("Let's work together to help guide this poor dog back home safely!", {
                    rate: 1.1,
                    pitch: 1.3,
                  })
                  setGameStage("maze-game")
                }, 300)
              }}
              className="bg-gradient-to-r from-green-400 to-blue-500 text-white text-2xl font-bold py-4 px-8 rounded-xl hover:scale-105 transition-transform"
            >
              Help Guide the Dog Home! 🏠
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (gameStage === "maze-game") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-400 to-purple-400 p-4">
        <VolumeControl isMuted={audio.isMuted} onToggle={() => audio.setIsMuted(!audio.isMuted)} />
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
              🗺️ Help {characterName} Guide the Dog Home! 🏠
            </h1>
            <p className="text-xl text-white mb-6">
              Use the arrow buttons to move the dog through the maze to reach its home!
            </p>
          </div>

          <Card className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-green-400">
            <MazeGame
              characterName={characterName}
              selectedCharacter={selectedCharacter}
              onComplete={() => setGameStage("final-celebration")}
              audio={audio}
            />
          </Card>

          <div className="text-center mt-6">
            <div className="bg-white rounded-xl p-4 inline-block">
              <p className="text-lg font-bold text-gray-800">🌟 Legend: 🐕 = Dog, 🏠 = Home, ⬛ = Wall, ⬜ = Path</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (gameStage === "final-celebration") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-400 to-purple-400 p-4">
        <VolumeControl isMuted={audio.isMuted} onToggle={() => audio.setIsMuted(!audio.isMuted)} />
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-yellow-400 mb-6">
            <div className="text-center">
              <div className="flex justify-center items-center gap-4 mb-6">
                <div className="text-6xl">{selectedCharacter?.emoji}</div>
                <Home className="w-12 h-12 text-green-500" />
                <div className="text-6xl">🐕</div>
              </div>
              <h2 className="text-4xl font-bold text-green-600 mb-6">🎉 Mission Complete! 🎉</h2>
              <p className="text-xl text-gray-700 mb-6">
                Thanks to your training, {characterName} successfully helped the lost dog find its way home!
              </p>

              <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl p-6 mb-6">
                <h3 className="text-2xl font-bold text-white mb-4">What {characterName} Used:</h3>
                <div className="flex justify-center gap-8">
                  <div className="text-center">
                    <Eye className="w-8 h-8 mx-auto mb-2 text-white" />
                    <p className="text-white font-bold">Sight to see the dog</p>
                  </div>
                  <div className="text-center">
                    <Volume2 className="w-8 h-8 mx-auto mb-2 text-white" />
                    <p className="text-white font-bold">Hearing to hear cries</p>
                  </div>
                  <div className="text-center">
                    <Brain className="w-8 h-8 mx-auto mb-2 text-white" />
                    <p className="text-white font-bold">Thinking to find the path</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-100 rounded-xl p-6">
                <h3 className="text-2xl font-bold text-blue-800 mb-4">🌟 What You Learned! 🌟</h3>
                <p className="text-lg font-bold text-blue-700">
                  AI needs human guidance to become helpful! AI is not magic - it's built by humans like you through
                  careful training and design thinking!
                </p>
              </div>
            </div>
          </Card>

          <div className="text-center">
            <Button
              onClick={() => {
                audio.playClickSound()
                setTimeout(() => {
                  audio.speak("Let's train another amazing AI friend! This is so much fun!", {
                    rate: 1.2,
                    pitch: 1.4,
                  })
                }, 200)
                setGameStage("character-select")
                setSelectedCharacter(null)
                setCharacterName("")
                setGameProgress({ sight: false, hearing: false, thinking: false })
                setCurrentRound(0)
                setShowCorrection(false)
                setUserAnswer("")
                setIsGuessing(false)
                setGuessingPhase("thinking")
                setShowSpeechBubble(false)
              }}
              className="bg-gradient-to-r from-purple-400 to-pink-500 text-white text-2xl font-bold py-4 px-8 rounded-xl hover:scale-105 transition-transform"
            >
              Train Another AI Friend! 🤖
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}