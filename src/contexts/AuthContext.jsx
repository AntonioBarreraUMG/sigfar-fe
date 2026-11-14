import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ApiError, createApiClient } from '../services/http.js';
import { loginApi, meApi } from '../services/authApi.js';
import { clearToken, getToken, saveToken } from '../services/sessionStore.js';

const AuthContext = createContext(null);
const guest = { estado: 'invitado', usuario: null, mensaje: '' };

export function AuthProvider({ children }) {
  const tokenRef = useRef(getToken());
  const [sesion, setSesion] = useState({
    estado: tokenRef.current ? 'comprobando' : 'invitado',
    usuario: null,
    mensaje: '',
  });

  const cerrarSesion = useCallback(() => {
    tokenRef.current = null;
    clearToken();
    setSesion(guest);
  }, []);

  const api = useMemo(
    () =>
      createApiClient({
        getToken: () => tokenRef.current,
        onUnauthorized: (tokenUsado) => {
          // Una respuesta de una petición antigua no debe cerrar una sesión nueva.
          if (tokenUsado && tokenRef.current === tokenUsado) {
            tokenRef.current = null;
            clearToken();
            setSesion(guest);
          }
        },
      }),
    [],
  );

  const verificarSesion = useCallback(
    async ({ signal } = {}) => {
      const tokenUsado = tokenRef.current;
      if (!tokenUsado) {
        setSesion(guest);
        return;
      }
      setSesion({ estado: 'comprobando', usuario: null, mensaje: '' });
      try {
        const usuario = await meApi(api, signal);
        if (!signal?.aborted && tokenRef.current === tokenUsado) {
          setSesion({ estado: 'autenticado', usuario, mensaje: '' });
        }
      } catch (error) {
        if (signal?.aborted || tokenRef.current !== tokenUsado) return;
        if (error.status === 401 || error.code === 'RESPUESTA_INVALIDA') {
          cerrarSesion();
        } else {
          // Fallos temporales de conexión NO destruyen la sesión guardada.
          setSesion({ estado: 'sin_conexion', usuario: null, mensaje: error.message });
        }
      }
    },
    [api, cerrarSesion],
  );

  useEffect(() => {
    if (!tokenRef.current) return undefined;
    const abort = new AbortController();
    verificarSesion({ signal: abort.signal });
    return () => abort.abort();
  }, [verificarSesion]);

  const iniciarSesion = useCallback(
    async (correo, clave) => {
      const { token, usuario } = await loginApi(api, { correo, clave });
      if (!token) throw new ApiError('No se recibió el token de la sesión.');
      // El token no se almacena en localStorage ni se incluye en URLs.
      saveToken(token);
      tokenRef.current = token;
      setSesion({ estado: 'autenticado', usuario, mensaje: '' });
      return usuario;
    },
    [api],
  );

  const value = useMemo(
    () => ({
      ...sesion,
      api,
      iniciarSesion,
      cerrarSesion,
      verificarSesion,
    }),
    [sesion, api, iniciarSesion, cerrarSesion, verificarSesion],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth debe estar dentro de AuthProvider.');
  return value;
}
