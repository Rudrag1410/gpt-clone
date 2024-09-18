import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { AxiosError } from "axios";

export default function Home() {
  const { register, handleSubmit, reset } = useForm<{ question: string }>();
  const [conversation, setConversation] = useState<
    { question: string; answer: string[] }[]
  >([]);

  const fetchAnswer = async (question: string): Promise<void> => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question }),
    });

    if (!response.body) {
      throw new Error("No response body.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      const chunk = decoder.decode(value, { stream: true });

      // Split the streamed text by newlines
      const splitChunks = chunk.split("\n");

      // Loop through each chunk
      splitChunks.forEach((splitChunk) => {
        if (splitChunk.trim() !== "") {
          const parsedData = splitChunk.replace(/^data: /, "").trim();

          if (parsedData !== "[DONE]") {
            // Update the last conversation's answer incrementally with each word
            setConversation((prev) =>
              prev.map((item, index) =>
                index === prev.length - 1
                  ? {
                      ...item,
                      answer: [...item.answer, parsedData], // Add new word to the answer array
                    }
                  : item
              )
            );
          }
        }
      });
    }
  };

  const mutation = useMutation<void, AxiosError, string>({
    mutationFn: fetchAnswer,
    onSuccess: () => {
      console.log("Streaming completed.");
    },
    onError: (error: AxiosError) => {
      console.error("Error fetching data:", error);
    },
  });

  const onSubmit = (data: { question: string }) => {
    const { question } = data;

    if (question.trim() === "") return; // Don't submit empty input

    // Add the new question to the conversation with an empty array for incremental answer
    setConversation((prev) => [...prev, { question, answer: [] }]);

    // Trigger the mutation (fetching the answer)
    mutation.mutate(question);

    // Reset the form after submitting
    reset();
  };

  return (
    <main>
      <form onSubmit={handleSubmit(onSubmit)}>
        <input
          type="text"
          {...register("question", { required: true })}
          placeholder="Enter your question"
        />
        <button type="submit">Submit</button>
      </form>

      <div>
        <h3>Conversation:</h3>
        <ul>
          {conversation.map((item, index) => (
            <li key={index}>
              <strong>Q: {item.question}</strong>
              <p>
                A:{" "}
                {item.answer.length > 0
                  ? item.answer.join(" ") // Display the answer as a string of words
                  : "Waiting for response..."}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
