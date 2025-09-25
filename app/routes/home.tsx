import "../App.css";
import { useState, useEffect, useRef } from "react";
import tmi from "tmi.js";
import { useCookies } from "react-cookie";
import ChatBox from "~/components/chatbox";
import CharadesEditor from "~/components/charades-editor";

export const initialCharades = {
  Activity: ["streaming", "pooping", "coding", "dancing", "crying", "singing", "bowling", "eating", "flying", "gaming", "painting", "fishing", "hiking", "driving", "shopping", "cooking", "swimming", "reading", "skiing", "arguing", "surfing", "consoling", "attacking", "arresting", "sliding", "lying", "mining", "reporting", "crashing out"],
  Animal: ["elephant", "giraffe", "kangaroo", "dolphin", "penguin", "dog", "cat", "rabbit", "frog", "spider", "snake", "fish", "fox", "monkey", "turtle"],
  Career: ["doctor", "teacher", "chef", "artist", "musician", "cleaner", "police", "photographer", "gymnast", "pilot", "firefighter", "content creator", "farmer", "plumber", "bodyguard", "mechanic"],
  Object: ["bicycle", "laptop", "guitar", "camera", "backpack", "phone", "book", "watch", "car", "wrecking ball", "microphone", "suitcase", "piano", "candle", "knife", "drum"],
  Movie: ["titanic", "spiderman", "superman", "lion king", "the matrix", "frozen", "forrest gump", "shawshank redemption", "joker", "alvin and the chimpmunks", "wall-e", "the dark knight", "toy story", "lego movie"],
  "TV Show": ["the office", "breaking bad", "doctor who", "squid game", "the walking dead", "big bang theory", "game of thrones"],
  Person: ["mr beast", "ludwig", "santa", "tooth fairy", "harry potter", "michael jackson", "usain bolt", "cristiano ronaldo", "albert einstein", "taylor swift", "neil armstrong"],
  Place: ["antarctica", "beach"],
  Song: ["headlock", "never gonna give you up", "pretty girl", "skyfall", "blinding lights", "shake it off", "astronaut in the ocean", "bad guy", "watermelon sugar", "drivers license", "happy", "call me maybe", "hello", "firework", "all star", "old town road"],
  Game: ["minecraft", "fortnite", "among us", "league of legends", "chess", "monopoly", "poker", "fall guys", "animal crossing", "overwatch"]
}

enum GameState {
  Home,
  InGame,
  NextRound,
  GameOver
}

type ChatterRecord = Record<string, { mod: boolean; subscriber: boolean; colour: string; score: number }>;

export type ChatMessage = {
  username: string;
  message: string;
  colour: string;
  badge?: string;
};

const App = () => {
  const [charades, setCharades] = useState<Record<string, string[]>>(initialCharades);
  const [channel, setChannel] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatters, setChatters] = useState<ChatterRecord>({});
  const [previousWinner, setPreviousWinner] = useState<string | null>(null);
  const [charade, setCharade] = useState<{ category: string; word: string | null }>();
  const [gameDetails, setGameDetails] = useState<{ round: number; totalRounds: number; }>({ round: 0, totalRounds: 10 });
  const [screen, setScreen] = useState<GameState>(GameState.Home);

  const [cookies, setCookies] = useCookies(["user", "charades", "rounds"]);

  const userInputRef = useRef<HTMLInputElement | null>(null);
  const screenRef = useRef(screen);
  const charadeRef = useRef(charade);

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    charadeRef.current = charade;
  }, [charade]);

  useEffect(() => {
    setCookies("charades", charades, { path: "/" });
  }, [charades]);

  useEffect(() => {
    setCookies("rounds", gameDetails.totalRounds, { path: "/" });
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
          if (charadeRef.current && message.toLowerCase().includes(charadeRef.current.word!.toLowerCase())) {
            setChatters((prevChatters) => {
              if (prevChatters[username]) {
                const updatedScore = prevChatters[username].score + 1;
                return { ...prevChatters, [username]: { ...prevChatters[username], score: updatedScore } };
              }
              return prevChatters;
            });
            setScreen(prev => GameState.NextRound);
            setPreviousWinner(prev => username);
          }
        }
      }
    });
  };

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
    if (cookies.charades) {
      setCharades(cookies.charades);
    }
    if (cookies.rounds) {
      setGameDetails((prev) => ({ ...prev, totalRounds: cookies.rounds }));
    }
  }, []);

  return (
    <div className="App bg-gray-900 min-h-screen text-white flex flex-col items-center justify-center">
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
            <h3 className="text-xl mb-2">Previous Round Winner: <strong style={{ color: chatters[previousWinner]?.colour || "white" }}>{previousWinner}</strong></h3>
          )}
          {gameDetails.round < gameDetails.totalRounds ? (
            <>
              <h2 className="text-2xl mb-2">Get ready for Round {gameDetails.round + 1} of {gameDetails.totalRounds}!</h2>
              <p className="text-gray-400 font-light">Before clicking next round you need to hide your screen and go fullscreen</p>
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
            setGameDetails({ round: 0, totalRounds: 5 });
          }} className="bg-gray-700 text-white p-2 rounded mt-4">
            Return Home
          </button>
        </div>
      )}
    </div>
  );
}

export default App;