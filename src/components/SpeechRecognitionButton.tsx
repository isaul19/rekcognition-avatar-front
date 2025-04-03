/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";

interface Props {
  question: string;
  setQuestion: React.Dispatch<React.SetStateAction<string>>;
}

const SpeechRecognitionButton = ({ question, setQuestion }: Props) => {
  const [isRecording, setIsRecording] = useState(false);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  useEffect(() => {
    if (!SpeechRecognition) {
      alert("El navegador no soporta SpeechRecognition.");
      return;
    }
  }, []);

  const recognition = new SpeechRecognition();
  recognition.lang = "es-ES";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    setQuestion(transcript);
    console.log("Transcripción:", transcript);
  };

  recognition.onerror = (event: any) => {
    console.error("Error de reconocimiento de voz:", event.error);
  };

  recognition.onend = () => {
    console.log("Reconocimiento de voz terminó.");
    setIsRecording(false);
  };

  const startRecording = () => {
    if (isRecording) {
      console.log("Ya se está grabando...");
      return;
    }

    recognition.start();
    setIsRecording(true);
    console.log("Comenzando a grabar...");
  };

  // Detener la grabación
  const stopRecording = () => {
    recognition.stop();
    setIsRecording(false);
    console.log("Grabación detenida.");
  };

  return (
    <div>
      <h2>Reconocimiento de Voz</h2>
      <p>{question || "Vacio..."}</p>
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? "Detener Grabación" : "Grabar Voz"}
      </button>
    </div>
  );
};

export default SpeechRecognitionButton;
