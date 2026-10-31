export async function healthApi(request, signal) {
  const data = await request('/health', { authorized: false, signal });
  return data?.servicio === 'SIGFAR' && data?.estado === 'activo';
}
