import { useState, useEffect, useRef } from "react";
import tmi from "tmi.js";
import { useCookies } from "react-cookie";
import ChatBox from "~/components/chatbox";
import CharadesEditor from "~/components/charades-editor";
import levenshtein from "js-levenshtein"

const version = "1.2.0";
const changelog = {
  "1.2.0": {
    changes : ["Added game types", "Added better matching for misspellings"],
    askReset: false
  },
  "1.1.0": {
    changes : ["Added versioning", "Added more charades", "Removed puncuation from answers so 'it's' and 'its' are the same", "Other nerdy stuff"],
    askReset: false
  },
  "1.0.0": {
    changes: ["Initial release"],
    askReset: false
  }
};

export const initialCharades = {
  Activity: ["streaming", "pooping", "coding", "dancing", "crying", "singing", "bowling", "eating", "flying", "gaming", "painting", "fishing", "hiking", "driving", "shopping", "cooking", "swimming", "reading", "skiing", "arguing", "surfing", "consoling", "attacking", "arresting", "sliding", "lying", "mining", "reporting", "crashing out", "meditating", "getting fired"],
  Animal: ["elephant", "giraffe", "kangaroo", "dolphin", "penguin", "dog", "cat", "rabbit", "frog", "spider", "snake", "fish", "fox", "monkey", "turtle", "pigeon", "seagull", "owl", "rat", "bee", "turkey", "crab", "squid", "octopus", "crocodile", "goat", "sloth", "seal", "duck"],
  Career: ["doctor", "teacher", "chef", "artist", "musician", "cleaner", "police", "photographer", "gymnast", "pilot", "firefighter", "content creator", "farmer", "plumber", "bodyguard", "mechanic", "boxer", "ballerina", "judge", "lawyer", "sculptor", "dentist", "detective", "therapist", "scientist", "astronaut", "veterinarian", "unemployed"],
  Object: ["bicycle", "laptop", "guitar", "camera", "backpack", "phone", "book", "watch", "car", "wrecking ball", "microphone", "suitcase", "piano", "candle", "knife", "drum", "lightbulb", "wallet", "glasses", "trophy", "letter", "flag", "key", "map", "brush", "hammer", "trolley", "dart", "compass", "binoculars", "monocle", "tripod", "yoyo"],
  Movie: ["titanic", "spiderman", "superman", "lion king", "the matrix", "frozen", "forrest gump", "shawshank redemption", "joker", "alvin and the chimpmunks", "wall-e", "the dark knight", "toy story", "lego movie", "Night at the Museum", "jumanji", "star wars", "godfather", "finding nemo", "the hunger games", "despicable me", "laid in america", "fight club", "terminator", "the shining", "the truman show", "hamilton", "inside out", "ratatouille", "inception", "scream", "madagacar"],
  "TV Show": ["the office", "breaking bad", "doctor who", "squid game", "the walking dead", "big bang theory", "game of thrones", "friends", "rick and morty", "stranger things", "family guy", "the simpsons", "love island", "phineas and ferb", "the middle", "bluey", "peppa pig", "dexter", "the rookie", "one piece", "south park", "severance", "house", "shameless", "suits"],
  Person: ["mr beast", "ludwig", "snoopy", "santa", "tooth fairy", "harry potter", "michael jackson", "usain bolt", "ronaldo", "einstein", "taylor swift", "neil armstrong", "peter griffin", "gordon ramsay", "darth vader", "spock", "squidward", "homer", "gandalf", "katniss everdeen", "tony stark", "kermit", "elmo", "spiderman", "batman", "super man", "rick astley", "drake", "kendrick", "averageharry", "steve jobs"],
  Place: ["antarctica", "beach", "boat", "castle", "desert", "mountain", "restaurant", "school", "library", "moon", "space", "airport", "basement", "circus", "museum", "bus", "taxi", "camp", "prison", "court", "hospital", "hotel", "comedy club", "bar", "concert", "office", "attic", "alley", "underpass", "bunker", "factory", "aquarium", "zoo"],
  Song: ["headlock", "never gonna give you up", "pretty girl", "skyfall", "blinding lights", "shake it off", "astronaut in the ocean", "bad guy", "watermelon sugar", "drivers license", "happy", "call me maybe", "hello", "firework", "all star", "old town road", "not like us", "sunflower", "uptown funk", "titanium", "roar", "shape of you", "sugar on my tongue", "party in the usa", "yale", "lovers rock", "YMCA", "dancing queen", "uptown girl", "smooth criminal", "africa", "we built this city", "we didn't start the fire", "everybody dance", "eye of the tiger", "surfin usa", "stayin alive", "mamma mia", "beat it", "kung fu fighting", "still standing", "hooked on a feeling"],
  Game: ["minecraft", "fortnite", "among us", "league of legends", "chess", "monopoly", "poker", "fall guys", "animal crossing", "overwatch", "rocket league", "pokemon go", "peak", "clash of clans", "gta", "blackjack", "uno", "valorant", "rainbow six", "rock paper scissors", "bingo", "vrchat", "ARK", "Sea of Thieves", "NBA", "FIFA", "Connect 4", "Balatro", "It Takes Two", "Date everything", "Mario Kart", "red dead", "overcooked", "WWE", "Watch Dogs", "Liars Bar", "assasins creed", "gorilla tag", "papas pizzeria", "crab game", "skate"]
};

enum GameState {
  Home,
  InGame,
  NextRound,
  GameOver
}

enum GameType {
  FirstCome,
  Every
}

type ChatterRecord = Record<string, { mod: boolean; subscriber: boolean; colour: string; score: number }>;

export type ChatMessage = {
  username: string;
  message: string;
  colour: string;
  badge?: string;
};

const stopWords = ["the", "is", "in", "and", "to", "a", "of", "it", "that", "i", "you", "he", "she", "they", "we", "on", "for", "with", "as", "was", "at", "by", "an"];

const App = () => {
  const [charades, setCharades] = useState<Record<string, string[]>>(() => {
    const stored = localStorage.getItem("charades");
    return stored ? JSON.parse(stored) : initialCharades;
  });
  const [channel, setChannel] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatters, setChatters] = useState<ChatterRecord>({});
  const [previousWinner, setPreviousWinner] = useState<string | null>(null);
  const [charade, setCharade] = useState<{ category: string; word: string | null }>();
  const [gameDetails, setGameDetails] = useState<{ round: number; totalRounds: number; guessTime?: number | null }>(() => {
    const storedRounds = localStorage.getItem("rounds");
    return { round: 0, totalRounds: storedRounds ? Number(storedRounds) : 10 };
  });
  const [screen, setScreen] = useState<GameState>(GameState.Home);
  const [gameType, setGameType] = useState<GameType>(() => {
    const storedGameType = Number(localStorage.getItem("gameType"));
    return storedGameType !== null ? storedGameType : GameType.Every;
  });

  const [cookies, setCookies] = useCookies(["user", "version"]);

  const userInputRef = useRef<HTMLInputElement | null>(null);
  const screenRef = useRef(screen);
  const charadeRef = useRef(charade);
  const gameTypeRef = useRef(gameType)

  const roundTime = 15;

  useEffect(() => {
    gameTypeRef.current = gameType;
    localStorage.setItem("gameType", String(Number(gameType)))
  }, [gameType])

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    charadeRef.current = charade;
  }, [charade]);

  useEffect(() => {
    localStorage.setItem("charades", JSON.stringify(charades));
  }, [charades]);

  useEffect(() => {
    localStorage.setItem("rounds", String(gameDetails.totalRounds));
  }, [gameDetails.totalRounds]);

  const connectToChannel = (channelName: string) => {
    const client = new tmi.Client({
      channels: [channelName]
    });

    client.connect().then(() => {
      console.log(`Connected to channel: ${channelName}`);
    }).catch((err) => {
      alert("Failed to connect to the channel. Please check the username and try again.");
      console.error(err);
      setChannel("");
    });

    client.on("message", (channel, tags, message, self) => {
      if (!self) {
        const username = tags["username"];
        const mod = !!tags["mod"];
        const subscriber = !!tags["subscriber"];
        const colour = tags["color"] || "white";
        if (!username) return;
        setChatters((prevChatters) => {
          if (!prevChatters[username]) {
            return { ...prevChatters, [username]: { mod, subscriber, colour, score: 0 } };
          } else {
            return prevChatters;
          }
        });

        if (screenRef.current === GameState.Home) {
          setMessages((prevMessages) => [...prevMessages, { username, message, colour }]);
        } else if (screenRef.current === GameState.InGame) {
          if (charadeRef.current && charadeRef.current.word && matchCharade(message)) {
            scorePoint(username);
          }
        }
      }
    });
  };

  const updateChatterScore = (username: string, score: number) => {
    setChatters((prevChatters) => {
      if (prevChatters[username]) {
        const updatedScore = prevChatters[username].score + score;
        return { ...prevChatters, [username]: { ...prevChatters[username], score: updatedScore } };
      }
      return prevChatters;
    });
  }

  const winnerNextRound = (username: string, score: number) => {
    updateChatterScore(username, score)
    setScreen(prev => GameState.NextRound);
    setPreviousWinner(prev => username);
    const audio = new Audio("/correct.mp3");
    audio.volume = 0.5;
    audio.play();
  }
  
  const scorePoint = (username: string) => {
    switch (gameTypeRef.current) {
      case GameType.FirstCome:
        winnerNextRound(username, 1);
        return;
      case GameType.Every:
        if (gameDetails.guessTime){
          const timeInSecondsElapsed = (Date.now() - gameDetails.guessTime) / 1000;
          const score = roundTime*100  * (1 - Math.log(1 + timeInSecondsElapsed) / Math.log(1 + roundTime));
          updateChatterScore(username, Math.floor(score));
        } else {
          gameDetails.guessTime = Date.now();
          setTimeout(() => {
            gameDetails.guessTime = null;
            winnerNextRound(username, roundTime*100);
          }, roundTime * 1000);
        }
        return;
      }
    }

  const fuzzySubstringMatch = (message: string, charade: string, threshold: number) => {
    for (let i = 0; i <= message.length - charade.length; i++) {
      const window = message.substring(i, i + charade.length);
      if (levenshtein(window, charade) <= threshold) return true;
    }
    return false;
  }

  const matchCharade = (message: string) => {
    if (!charadeRef.current || !charadeRef.current.word) return false;

    const normalisedCharade = normalise(charadeRef.current.word);
    const normalisedMessage = normalise(message);

    if (normalisedCharade.length === 0 || normalisedMessage.length === 0) return false;

    if (normalisedMessage.includes(normalisedCharade)){
      return true;
    }

    return fuzzySubstringMatch(normalisedMessage, normalisedCharade, 4);
  };

  const normalise = (text: string): string => {
    return text
      .toLowerCase()
      .replaceAll(/[^a-zA-Z0-9\s]/g, "")
      .split(/\s+/)
      .filter(word => word && !stopWords.includes(word))
      .join("");
  }

  const getRandomWord = () => {
    const categories = Object.keys(charades);
    const category = categories[Math.floor(Math.random() * categories.length)];
    const words = charades[category as keyof typeof charades];
    const word = words[Math.floor(Math.random() * words.length)];
    return { category, word };
  }

  const nextRound = () => {
    if (gameDetails.round >= gameDetails.totalRounds) {
      setScreen(GameState.GameOver);
      return;
    }
    setCharade(getRandomWord());
    setGameDetails((prev) => ({ ...prev, round: prev.round + 1 }));
    setScreen(GameState.InGame);
  }

  const handleUserSubmit = () => {
    if (!userInputRef.current) return;
    const user = userInputRef.current.value;
    if (user) {
      setCookies("user", user, { path: "/" });
      setChannel(user);
      connectToChannel(user);
    }
  };

  useEffect(() => {
    if (cookies.user && userInputRef.current) {
      userInputRef.current.value = cookies.user;
    }

    if (cookies.version !== version) {
      setCookies("version", version, { path: "/" });
      if (changelog[version].askReset) {
        if (confirm(`Chatterades has been updated to version ${version}!\n\nChanges:\n- ${changelog[version].changes.join("\n- ")}\n\nIt is recommended to reset your charades to avoid any issues, do you want to reset now? (Your custom charades will be lost, you can do this later)`)) {
          setCharades(initialCharades);
        }
      } else {
        alert(`Chatterades has been updated to version ${version}!\n\nChanges:\n- ${changelog[version].changes.join("\n- ")}`);
      }
    }

  }, []);

  return (
    <div className="App bg-gray-900 min-h-[calc(100vh-60px)] text-white flex flex-col items-center justify-center">
      {screen === GameState.Home && (
        channel ? (
          <div className="mb-4">
            <div className="flex gap-2 justify-between items-center mb-4">
              <p>Connected to {channel}</p>
              <button onClick={() => setScreen(GameState.NextRound)} className="bg-gray-700 text-white p-2 rounded">
                Start Game
              </button>
            </div>
            <hr />
            <div className="my-4 w-full">
              <details className="bg-gray-800 p-2 m-2 rounded">
                <summary className="cursor-pointer select-none text-white font-medium">Settings</summary>
                <div className="mt-2 flex gap-2 items-center text-center">
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2 items-center">
                      <p>Max Rounds:</p>
                      <input
                        type="number"
                        min="1"
                        value={gameDetails.totalRounds}
                        onChange={(e) => setGameDetails((prev) => ({ ...prev, totalRounds: Number(e.target.value) }))}
                        className="bg-gray-800 p-2 rounded border"
                      />
                    </div>
                    <button onClick={() => setCharades(initialCharades)} className="!bg-red-600 !hover:bg-red-500 text-white p-2 rounded">
                      Reset All Charades
                    </button>
                    <select
                      className="p-2 border rounded w-full text-sm"
                      value={gameType}
                      onChange={(e) => {
                        setGameType(Number(e.target.value) as GameType)
                      }}
                    >
                      <option value={GameType.FirstCome} className="text-black">
                        First Come - only the first correct guesser earns points
                      </option>
                      <option value={GameType.Every} className="text-black">
                        Staggered - everyone earns points within {roundTime}s (less over time)
                      </option>
                    </select>
                  </div>
                  <CharadesEditor charades={charades} setCharades={setCharades} />
                </div>
              </details>
            </div>
            <ChatBox messages={messages} />
          </div>
        ) : (
          <div className="mb-4 flex items-center align-middle justify-center gap-2">
            <input ref={userInputRef} type="text" onKeyDown={(e) => e.key === "Enter" && handleUserSubmit()} placeholder="Enter your twitch name" className="p-2 rounded border w-96 bg-gray-800" />
            <button onClick={handleUserSubmit} className="bg-gray-700 text-white p-2 rounded">
              Enter
            </button>
          </div>
        )
      )}
      {screen === GameState.NextRound && (
        <div className="flex items-center gap-2 flex-col">
          {previousWinner && (
            <>
              <h3 className="text-xl">Round Winner: <strong style={{ color: chatters[previousWinner]?.colour || "white" }}>{previousWinner}</strong></h3>
              <h3 className="text-xl mb-2">Word: <strong>{charade?.word}</strong></h3>
            </>
          )}
          {gameDetails.round < gameDetails.totalRounds ? (
            <>
              <h2 className="text-2xl mb-2">Get ready for Round {gameDetails.round + 1} of {gameDetails.totalRounds}!</h2>
              <p className="text-gray-400 font-light text-center">Before clicking next round you need to hide your screen and go fullscreen.<br />You can show this screen though :D</p>
            </>
          ) : (
            <h2 className="text-2xl mb-2">Game over!</h2>
          )}
          <button onClick={nextRound} className="bg-gray-700 text-white p-2 rounded">
            {gameDetails.round >= gameDetails.totalRounds ? "See Final Scores" : "Next Round"}
          </button>
          {gameDetails.round < gameDetails.totalRounds && (
            <div>
              <h3 className="text-sm font-bold text-left mt-4">Current Scores:</h3>
              <div className="h-64 w-96 overflow-y-auto mt-2 border">
                {Object.entries(chatters).sort((a, b) => b[1].score - a[1].score).map(([username, details], index) => (
                  <div key={username} className="flex justify-between p-2 border-b odd:bg-gray-800 even:bg-gray-700">
                    <p>{index + 1}. <strong style={{ color: details.colour }}> {username}</strong></p>
                    <p>Score: {details.score}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {screen === GameState.InGame && (
        <div>
          <h2 className="text-2xl text-center">Round {gameDetails.round} of {gameDetails.totalRounds}</h2>
          <div className="text-center mt-4">
            <h3 className="text-3xl mb-4">Word: {charade?.word}</h3>
            <button onClick={() => {
              setCharade(getRandomWord());
            }} className="bg-gray-700 text-white p-2 rounded mb-4">
              Reroll Word
            </button>
            <div className="text-gray-400 font-light mb-4">
              {charade && (
                <p>Tell the chat to guess the <strong className="font-semibold underline">{charade?.category}</strong>!</p>
              )}
            </div>
          </div>
        </div>
      )}
      {screen === GameState.GameOver && (
        <div className="text-center">
          <h2 className="text-3xl mb-4">Game Over!</h2>
          <h3 className="text-2xl mb-4">Final Scores:</h3>
          <div className="h-64 w-96 overflow-y-auto border mx-auto">
            {Object.entries(chatters).sort((a, b) => b[1].score - a[1].score).map(([username, details], index) => (
              <div key={username} className="flex justify-between p-2 border-b odd:bg-gray-800 even:bg-gray-700">
                <p>{index + 1}. <strong style={{ color: details.colour }}> {username}</strong></p>
                <p>Score: {details.score}</p>
              </div>
            ))}
          </div>
          <button onClick={() => {
            setScreen(GameState.Home);
            setChatters({});
            setMessages([]);
            setPreviousWinner(null);
            setCharade(undefined);
            setGameDetails(prev => ({ ...prev, round: 0 }));
          }} className="bg-gray-700 text-white p-2 rounded mt-4">
            Return Home
          </button>
        </div>
      )}
    </div>
  );
}

export default App;