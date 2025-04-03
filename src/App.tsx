/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useState, useEffect } from "react";
import axios from "axios";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskType,
} from "@heygen/streaming-avatar";
import SpeechRecognitionButton from "./components/SpeechRecognitionButton";

export const App = () => {
  const avatarVideoRef = useRef<HTMLVideoElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const [avatar, setAvatar] = useState<StreamingAvatar | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isAvatarReady, setIsAvatarReady] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [lastSpokenMessage, setLastSpokenMessage] = useState("");
  const [question, setQuestion] = useState("");
  const [voiceResponse, setVoiceResponse] = useState({
    message: "",
    valid: false,
    name: "",
  });

  const fetchAccessToken = async (): Promise<string> => {
    const apiKey = import.meta.env.VITE_HEYGEN_API_KEY;
    const response = await fetch("https://api.heygen.com/v1/streaming.create_token", {
      method: "POST",
      headers: { "x-api-key": apiKey },
    });
    const { data } = await response.json();
    return data.token;
  };

  const initializeSession = async () => {
    if (hasInitialized) return;

    const token = await fetchAccessToken();
    const newAvatar = new StreamingAvatar({ token });
    const session = await newAvatar.createStartAvatar({
      quality: AvatarQuality.High,
      avatarName: "Wayne_20240711",
    });

    setAvatar(newAvatar);
    setSessionData(session);
    setIsSessionActive(true);

    newAvatar.on(StreamingEvents.STREAM_READY, handleStreamReady);
    newAvatar.on(StreamingEvents.STREAM_DISCONNECTED, terminateAvatarSession);

    await newAvatar.speak({
      text: "Buen día. ¿Me podría decir su nombre?",
      taskType: TaskType.REPEAT,
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
      setCameraStream(stream);
    } catch (error) {
      console.error("Error al acceder a la cámara:", error);
    }
  };

  const handleStreamReady = (event: any) => {
    setIsAvatarReady(true);
    if (event.detail && avatarVideoRef.current) {
      avatarVideoRef.current.srcObject = event.detail;
    } else {
      console.error("Stream is not available", event);
    }
  };

  const handleStreamDisconnected = () => {
    if (avatarVideoRef.current) {
      avatarVideoRef.current.srcObject = null;
    }
    setIsSessionActive(false);
    setIsAvatarReady(false);
    setAvatar(null);
    setSessionData(null);
  };

  const terminateAvatarSession = async () => {
    if (!avatar || !sessionData) return;
    await avatar.stopAvatar();
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = null;
      }
    }
    handleStreamDisconnected();
  };

  const speakAvatar = async (message: string) => {
    if (!avatar || message === lastSpokenMessage) return;
    setLastSpokenMessage(message);
    await avatar.speak({
      text: message,
      taskType: TaskType.REPEAT,
    });
  };

  useEffect(() => {
    initializeSession();
    return () => {
      terminateAvatarSession();
    };
  }, []);

  useEffect(() => {
    if (!question.trim()) return;
    const validate = async () => {
      try {
        const { data } = await axios.post("http://localhost:3001/api/openai/validate-name", {
          name: question,
        });
        setVoiceResponse(data.data);
      } catch (error) {
        console.error("Error validando el nombre:", error);
      }
    };
    validate();
  }, [question]);

  useEffect(() => {
    if (!voiceResponse.message.trim()) return;
    speakAvatar(voiceResponse.message);
  }, [voiceResponse.message]);

  useEffect(() => {
    if (!voiceResponse.valid || !cameraVideoRef.current) return;
    const captureAndSendPhoto = async () => {
      const video = cameraVideoRef.current;
      const canvas = document.createElement("canvas");
      if (!video) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const formData = new FormData();
        formData.append("file", blob, "photo.png");
        try {
          const response = await fetch("http://localhost:3001/api/amazon/save-image", {
            method: "POST",
            body: formData,
          });
          if (response.ok) {
            console.log("Foto enviada con éxito");
          } else {
            console.error("Error al enviar la foto");
          }
        } catch (error) {
          console.error("Error en la solicitud:", error);
        }
      }, "image/png");
    };
    captureAndSendPhoto();
  }, [voiceResponse.valid]);

  return (
    <main
      className="container"
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <h2>Interactive Avatar Demo (Vite + TypeScript)</h2>
      <div style={{ display: "flex", justifyContent: "center", gap: "20px", width: "1200px" }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ textAlign: "center" }}>Avatar</h3>
          <video
            ref={avatarVideoRef}
            autoPlay
            playsInline
            style={{ width: "100%", maxHeight: "300px" }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ textAlign: "center" }}>Cámara</h3>
          <video
            ref={cameraVideoRef}
            autoPlay
            playsInline
            style={{ width: "100%", maxHeight: "300px" }}
          />
        </div>
      </div>
      {isAvatarReady && <button onClick={terminateAvatarSession}>End Session</button>}
      <SpeechRecognitionButton question={question} setQuestion={setQuestion} />
    </main>
  );
};
