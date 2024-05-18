import ReconnectingWebSocket from "reconnecting-websocket";

export type WebsocketMessage = {
    topic: string;
    payload: object;
};

export type WebsocketListener = (message: WebsocketMessage) => void;

const WEBSOCKET_LISTENERS: WebsocketListener[] = [];

const WEBSOCKET_URL = (() => {
    const { protocol, hostname, port } = window.location;
    let wsProtocol = protocol === "https" ? "wss" : "ws";
    return `${wsProtocol}://${hostname}:${port}/api/ws`;
})();

new ReconnectingWebSocket(WEBSOCKET_URL).onmessage = ({ data }) => {
    const message = JSON.parse(data);
    WEBSOCKET_LISTENERS.forEach((listener) => listener(message));
};

export const uploadReceipt = (files: File[]): Promise<void>[] => files.map((file): Promise<void> => {
    const formData = new FormData();
    formData.append("file", file, file.name);
    // formData.append("content_type", file.type);

    return fetch(`/api/receipt`, {
        method: "POST",
        headers: {
            Accept: "application/json",
        },
        body: formData,
    })
        .then((r) => r.json())
        .then(({ path }) => path);
});

export const getStuff = () => fetch("/api/stuff").then((r) => r.json());
