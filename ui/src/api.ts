import axiosss from "axios";
import Cookies from "js-cookie";
import ReconnectingWebSocket from "reconnecting-websocket";

const WS_ENABLED = false;

// Create an Axios instance
export const axios = axiosss.create();

// Add an interceptor to include the Bearer token from cookies
axios.interceptors.request.use(
  (config) => {
    const token = Cookies.get("jwt");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export type WebsocketMessage = {
  topic: string;
  payload: object;
};

export type WebsocketListener = (message: WebsocketMessage) => void;

const WEBSOCKET_LISTENERS: WebsocketListener[] = [];

if (WS_ENABLED) {
  const WEBSOCKET_URL = (() => {
    const token = Cookies.get("jwt");
    const { protocol, hostname, port } = window.location;
    let wsProtocol = protocol === "https" ? "wss" : "ws";
    return `${wsProtocol}://${hostname}:${port}/api/ws?token=${token}`;
  })();

  new ReconnectingWebSocket(WEBSOCKET_URL).onmessage = ({ data }) => {
    const message = JSON.parse(data);
    WEBSOCKET_LISTENERS.forEach((listener) => listener(message));
  };
}

export const subscribe = (listener: WebsocketListener) => {
  WEBSOCKET_LISTENERS.push(listener);
};

export const unsubscribe = (listener: WebsocketListener) => {
  const i = WEBSOCKET_LISTENERS.indexOf(listener);
  WEBSOCKET_LISTENERS.splice(i, 1);
};

export const setJwt = (token: string) => {
  Cookies.set("jwt", token, {
    expires: 7,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  });
};
