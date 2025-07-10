// Manual mock for child_process
export const execSync = jest.fn();
export const exec = jest.fn();
export const spawn = jest.fn();
export const fork = jest.fn();

export default {
  execSync,
  exec,
  spawn,
  fork
};