#!/usr/bin/env python3
"""
Invoice Insights Service Manager
GUI to manage backend and frontend services (non-blocking)
"""

import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import subprocess
import os
import sys
import socket
from threading import Thread
import time
import queue
import logging
import psutil

# Setup logging
log_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'service_manager.log')
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

logger.info("=" * 80)
logger.info("Service Manager Started")
logger.info(f"Script location: {os.path.abspath(__file__)}")
logger.info(f"Log file: {log_file}")
logger.info("=" * 80)

class ServiceManager:
    def __init__(self, root):
        logger.info("Initializing ServiceManager")
        self.root = root
        self.root.title("Invoice Insights - Service Manager")
        self.root.geometry("900x700")
        self.root.resizable(True, True)

        # Detect paths
        logger.info("Detecting paths...")
        self.backend_path = None
        self.frontend_path = None
        self.detect_paths()

        logger.info(f"Backend path: {self.backend_path}")
        logger.info(f"Frontend path: {self.frontend_path}")

        # Process tracking
        self.backend_process = None
        self.frontend_process = None

        # Status update queue (thread-safe)
        self.status_queue = queue.Queue()

        # Lock for process operations
        import threading
        self.lock = threading.Lock()

        # UI Setup
        logger.info("Setting up UI...")
        self.setup_ui()

        # Start background status checker
        self.status_checker_active = True
        logger.info("Starting background status checker...")
        Thread(target=self.background_status_checker, daemon=True).start()

        # Process queue updates
        self.process_queue()
        logger.info("ServiceManager initialization complete")

    def detect_paths(self):
        """Detect backend and frontend paths"""
        logger.info("Attempting to detect paths...")

        # Try script directory first
        script_dir = os.path.dirname(os.path.abspath(__file__))
        logger.info(f"Script directory: {script_dir}")
        logger.info(f"Contents: {os.listdir(script_dir)}")

        # Check if we're in the project root
        backend_check = os.path.join(script_dir, 'backend')
        frontend_check = os.path.join(script_dir, 'frontend')
        logger.info(f"Checking for backend at: {backend_check} (exists: {os.path.exists(backend_check)})")
        logger.info(f"Checking for frontend at: {frontend_check} (exists: {os.path.exists(frontend_check)})")

        if os.path.exists(backend_check) and os.path.exists(frontend_check):
            logger.info("Found backend and frontend in script directory")
            self.backend_path = backend_check
            self.frontend_path = frontend_check
            return

        # Check parent directory
        parent_dir = os.path.dirname(script_dir)
        logger.info(f"Checking parent directory: {parent_dir}")
        logger.info(f"Contents: {os.listdir(parent_dir)}")

        backend_check = os.path.join(parent_dir, 'backend')
        frontend_check = os.path.join(parent_dir, 'frontend')
        logger.info(f"Checking for backend at: {backend_check} (exists: {os.path.exists(backend_check)})")
        logger.info(f"Checking for frontend at: {frontend_check} (exists: {os.path.exists(frontend_check)})")

        if os.path.exists(backend_check) and os.path.exists(frontend_check):
            logger.info("Found backend and frontend in parent directory")
            self.backend_path = backend_check
            self.frontend_path = frontend_check
            return

        # If not found, ask user
        logger.warning("Could not auto-detect paths, asking user...")
        self.ask_for_paths()

    def ask_for_paths(self):
        """Ask user to select the project directory"""
        logger.info("Opening path selection dialog...")
        root_window = tk.Tk()
        root_window.withdraw()

        messagebox.showinfo("Path Detection",
                          "Could not find backend/frontend directories.\n\n"
                          "Please select the project root directory (ai-invoice-analyzer)")

        project_root = filedialog.askdirectory(title="Select ai-invoice-analyzer directory")
        logger.info(f"User selected: {project_root}")

        if not project_root:
            logger.error("User did not select a directory, exiting")
            messagebox.showerror("Error", "Project directory not selected. Cannot continue.")
            sys.exit(1)

        backend = os.path.join(project_root, 'backend')
        frontend = os.path.join(project_root, 'frontend')

        logger.info(f"Checking selected paths:")
        logger.info(f"  Backend: {backend} (exists: {os.path.exists(backend)})")
        logger.info(f"  Frontend: {frontend} (exists: {os.path.exists(frontend)})")

        if not os.path.exists(backend) or not os.path.exists(frontend):
            logger.error(f"Selected directory does not contain backend/frontend")
            messagebox.showerror("Error",
                               f"Invalid directory.\n\n"
                               f"Expected to find:\n"
                               f"  {backend}\n"
                               f"  {frontend}")
            sys.exit(1)

        logger.info("Paths validated successfully")
        self.backend_path = backend
        self.frontend_path = frontend
        root_window.destroy()

    def setup_ui(self):
        """Setup the UI layout"""
        logger.info("Setting up UI components")
        style = ttk.Style()
        style.theme_use('clam')

        # Title
        title_frame = ttk.Frame(self.root)
        title_frame.pack(fill=tk.X, padx=20, pady=20)
        title_label = ttk.Label(title_frame, text="Invoice Insights Service Manager",
                               font=("Arial", 16, "bold"))
        title_label.pack()

        # Path info
        path_frame = ttk.Frame(self.root)
        path_frame.pack(fill=tk.X, padx=20, pady=5)
        ttk.Label(path_frame, text=f"Backend: {self.backend_path}",
                 font=("Arial", 8), foreground="gray").pack(anchor=tk.W)
        ttk.Label(path_frame, text=f"Frontend: {self.frontend_path}",
                 font=("Arial", 8), foreground="gray").pack(anchor=tk.W)

        # Log file info
        log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'service_manager.log')
        ttk.Label(path_frame, text=f"Log: {log_path}",
                 font=("Arial", 8), foreground="gray").pack(anchor=tk.W)

        # Main container with notebook (tabs)
        notebook = ttk.Notebook(self.root)
        notebook.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)

        # Services Tab
        services_frame = ttk.Frame(notebook)
        notebook.add(services_frame, text="Services")
        self.setup_services_tab(services_frame)

        # Processes Tab
        processes_frame = ttk.Frame(notebook)
        notebook.add(processes_frame, text="Running Instances")
        self.setup_processes_tab(processes_frame)

        # Actions Frame
        actions_frame = ttk.Frame(self.root)
        actions_frame.pack(fill=tk.X, padx=20, pady=20)

        ttk.Button(actions_frame, text="Start All", command=self.start_all_threaded, width=15).pack(side=tk.LEFT, padx=5)
        ttk.Button(actions_frame, text="Stop All", command=self.stop_all_threaded, width=15).pack(side=tk.LEFT, padx=5)
        ttk.Button(actions_frame, text="Restart All", command=self.restart_all_threaded, width=15).pack(side=tk.LEFT, padx=5)
        ttk.Button(actions_frame, text="View Logs", command=self.view_logs, width=15).pack(side=tk.LEFT, padx=5)
        ttk.Button(actions_frame, text="Exit", command=self.on_exit, width=15).pack(side=tk.RIGHT, padx=5)

    def setup_services_tab(self, parent):
        """Setup the services management tab"""
        services_frame = ttk.LabelFrame(parent, text="Services", padding=20)
        services_frame.pack(fill=tk.BOTH, expand=True)

        # Backend Service
        backend_frame = ttk.Frame(services_frame)
        backend_frame.pack(fill=tk.X, pady=15)

        ttk.Label(backend_frame, text="Backend (Node.js)", font=("Arial", 12, "bold")).pack(anchor=tk.W)

        backend_info_frame = ttk.Frame(backend_frame)
        backend_info_frame.pack(fill=tk.X, pady=5)
        ttk.Label(backend_info_frame, text="Status:").pack(side=tk.LEFT, padx=5)
        self.backend_status_label = ttk.Label(backend_info_frame, text="Stopped",
                                             foreground="red", font=("Arial", 10, "bold"))
        self.backend_status_label.pack(side=tk.LEFT, padx=5)

        ttk.Label(backend_info_frame, text="Port: 3000").pack(side=tk.LEFT, padx=20)
        self.backend_pid_label = ttk.Label(backend_info_frame, text="PID: -")
        self.backend_pid_label.pack(side=tk.LEFT, padx=5)

        backend_btn_frame = ttk.Frame(backend_frame)
        backend_btn_frame.pack(fill=tk.X, pady=10)
        self.backend_start_btn = ttk.Button(backend_btn_frame, text="Start",
                                           command=self.start_backend_threaded, width=15)
        self.backend_start_btn.pack(side=tk.LEFT, padx=5)
        self.backend_stop_btn = ttk.Button(backend_btn_frame, text="Stop",
                                          command=self.stop_backend_threaded, width=15, state=tk.DISABLED)
        self.backend_stop_btn.pack(side=tk.LEFT, padx=5)
        self.backend_restart_btn = ttk.Button(backend_btn_frame, text="Restart",
                                             command=self.restart_backend_threaded, width=15)
        self.backend_restart_btn.pack(side=tk.LEFT, padx=5)

        # Separator
        ttk.Separator(services_frame, orient=tk.HORIZONTAL).pack(fill=tk.X, pady=15)

        # Frontend Service
        frontend_frame = ttk.Frame(services_frame)
        frontend_frame.pack(fill=tk.X, pady=15)

        ttk.Label(frontend_frame, text="Frontend (Vite)", font=("Arial", 12, "bold")).pack(anchor=tk.W)

        frontend_info_frame = ttk.Frame(frontend_frame)
        frontend_info_frame.pack(fill=tk.X, pady=5)
        ttk.Label(frontend_info_frame, text="Status:").pack(side=tk.LEFT, padx=5)
        self.frontend_status_label = ttk.Label(frontend_info_frame, text="Stopped",
                                              foreground="red", font=("Arial", 10, "bold"))
        self.frontend_status_label.pack(side=tk.LEFT, padx=5)

        ttk.Label(frontend_info_frame, text="Port: 5173").pack(side=tk.LEFT, padx=20)
        self.frontend_pid_label = ttk.Label(frontend_info_frame, text="PID: -")
        self.frontend_pid_label.pack(side=tk.LEFT, padx=5)

        frontend_btn_frame = ttk.Frame(frontend_frame)
        frontend_btn_frame.pack(fill=tk.X, pady=10)
        self.frontend_start_btn = ttk.Button(frontend_btn_frame, text="Start",
                                            command=self.start_frontend_threaded, width=15)
        self.frontend_start_btn.pack(side=tk.LEFT, padx=5)
        self.frontend_stop_btn = ttk.Button(frontend_btn_frame, text="Stop",
                                           command=self.stop_frontend_threaded, width=15, state=tk.DISABLED)
        self.frontend_stop_btn.pack(side=tk.LEFT, padx=5)
        self.frontend_restart_btn = ttk.Button(frontend_btn_frame, text="Restart",
                                              command=self.restart_frontend_threaded, width=15)
        self.frontend_restart_btn.pack(side=tk.LEFT, padx=5)

    def setup_processes_tab(self, parent):
        """Setup the running instances tab"""
        processes_frame = ttk.LabelFrame(parent, text="Running Node.js Instances", padding=20)
        processes_frame.pack(fill=tk.BOTH, expand=True)

        # Treeview for processes
        columns = ('PID', 'Port', 'Command', 'Status')
        self.processes_tree = ttk.Treeview(processes_frame, columns=columns, height=15)
        self.processes_tree.column('#0', width=100, minwidth=100)
        self.processes_tree.column('PID', width=80, minwidth=80)
        self.processes_tree.column('Port', width=60, minwidth=60)
        self.processes_tree.column('Command', width=400, minwidth=200)
        self.processes_tree.column('Status', width=100, minwidth=100)

        self.processes_tree.heading('#0', text='Service')
        self.processes_tree.heading('PID', text='PID')
        self.processes_tree.heading('Port', text='Port')
        self.processes_tree.heading('Command', text='Command')
        self.processes_tree.heading('Status', text='Status')

        self.processes_tree.pack(fill=tk.BOTH, expand=True)

        # Buttons for process management
        btn_frame = ttk.Frame(processes_frame)
        btn_frame.pack(fill=tk.X, pady=10)

        ttk.Button(btn_frame, text="Kill Selected", command=self.kill_selected_process, width=20).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Refresh", command=self.refresh_processes, width=20).pack(side=tk.LEFT, padx=5)

    def get_node_processes(self):
        """Get all running Node.js processes"""
        logger.debug("Getting Node.js processes")
        processes = []
        try:
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    if 'node' in proc.info['name'].lower():
                        processes.append(proc)
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    pass
        except Exception as e:
            logger.error(f"Error getting processes: {e}")
        return processes

    def get_port_from_process(self, proc):
        """Try to extract port from process command line"""
        try:
            cmdline = ' '.join(proc.cmdline())
            if '3000' in cmdline or 'npm run dev' in cmdline and 'backend' in str(proc.cwd()):
                return 3000
            elif '5173' in cmdline or 'npm run dev' in cmdline and 'frontend' in str(proc.cwd()):
                return 5173
        except:
            pass
        return None

    def refresh_processes(self):
        """Refresh the process list"""
        logger.info("Refreshing process list")
        Thread(target=self._refresh_processes_bg, daemon=True).start()

    def _refresh_processes_bg(self):
        """Background refresh of process list"""
        try:
            processes = self.get_node_processes()
            self.status_queue.put(('processes', processes))
        except Exception as e:
            logger.error(f"Error refreshing processes: {e}")

    def update_processes_tree(self, processes):
        """Update the processes treeview"""
        # Clear existing items
        for item in self.processes_tree.get_children():
            self.processes_tree.delete(item)

        # Add backend processes
        backend_item = self.processes_tree.insert('', 'end', text='Backend (3000)', values=('', '', '', ''))
        for proc in processes:
            try:
                cwd = proc.cwd() if hasattr(proc, 'cwd') else ''
                if 'backend' in cwd.lower():
                    cmd = ' '.join(proc.cmdline()[:3]) if proc.cmdline() else 'node'
                    self.processes_tree.insert(backend_item, 'end', text='',
                                             values=(proc.pid, '3000', cmd, 'Running'))
            except:
                pass

        # Add frontend processes
        frontend_item = self.processes_tree.insert('', 'end', text='Frontend (5173)', values=('', '', '', ''))
        for proc in processes:
            try:
                cwd = proc.cwd() if hasattr(proc, 'cwd') else ''
                if 'frontend' in cwd.lower():
                    cmd = ' '.join(proc.cmdline()[:3]) if proc.cmdline() else 'node'
                    self.processes_tree.insert(frontend_item, 'end', text='',
                                             values=(proc.pid, '5173', cmd, 'Running'))
            except:
                pass

        # Add other Node processes
        other_item = self.processes_tree.insert('', 'end', text='Other', values=('', '', '', ''))
        for proc in processes:
            try:
                cwd = proc.cwd() if hasattr(proc, 'cwd') else ''
                if 'backend' not in cwd.lower() and 'frontend' not in cwd.lower():
                    cmd = ' '.join(proc.cmdline()[:3]) if proc.cmdline() else 'node'
                    self.processes_tree.insert(other_item, 'end', text='',
                                             values=(proc.pid, '?', cmd, 'Running'))
            except:
                pass

    def kill_selected_process(self):
        """Kill the selected process"""
        selected = self.processes_tree.selection()
        if not selected:
            messagebox.showwarning("Warning", "Please select a process to kill")
            return

        item = selected[0]
        values = self.processes_tree.item(item)['values']
        if not values or not values[0]:  # No PID
            messagebox.showwarning("Warning", "Please select a process (not a category)")
            return

        pid = int(values[0])
        try:
            proc = psutil.Process(pid)
            name = proc.name()
            if messagebox.askyesno("Confirm", f"Kill process {pid} ({name})?"):
                logger.info(f"Killing process {pid}")
                proc.terminate()
                time.sleep(1)
                if proc.is_running():
                    proc.kill()
                self.refresh_processes()
        except Exception as e:
            logger.error(f"Error killing process: {e}")
            messagebox.showerror("Error", f"Failed to kill process: {e}")

    def view_logs(self):
        """Open the log file in notepad"""
        log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'service_manager.log')
        logger.info(f"Opening log file: {log_path}")
        try:
            if sys.platform == 'win32':
                os.startfile(log_path)
            else:
                os.system(f'open "{log_path}"')
        except Exception as e:
            logger.error(f"Failed to open log file: {e}")
            messagebox.showerror("Error", f"Failed to open log file: {e}")

    def port_in_use(self, port):
        """Check if a port is in use (non-blocking check)"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            result = sock.connect_ex(('127.0.0.1', port))
            sock.close()
            return result == 0
        except Exception as e:
            logger.debug(f"Error checking port {port}: {e}")
            return False

    def background_status_checker(self):
        """Background thread continuously checks service status"""
        logger.info("Background status checker started")
        while self.status_checker_active:
            try:
                backend_running = self.port_in_use(3000)
                frontend_running = self.port_in_use(5173)
                self.status_queue.put(('status', backend_running, frontend_running))
                time.sleep(1.5)
            except Exception as e:
                logger.error(f"Error in status checker: {e}")
                time.sleep(1.5)

    def process_queue(self):
        """Process UI updates from background threads"""
        try:
            while True:
                msg = self.status_queue.get_nowait()
                if msg[0] == 'status':
                    _, backend_running, frontend_running = msg
                    self.update_status(backend_running, frontend_running)
                elif msg[0] == 'processes':
                    _, processes = msg
                    self.update_processes_tree(processes)
        except queue.Empty:
            pass

        # Schedule next queue check
        self.root.after(100, self.process_queue)

    def update_status(self, backend_running, frontend_running):
        """Update UI status (called from main thread)"""
        # Backend
        if backend_running:
            self.backend_status_label.config(text="Running", foreground="green")
            self.backend_start_btn.config(state=tk.DISABLED)
            self.backend_stop_btn.config(state=tk.NORMAL)
            self.backend_restart_btn.config(state=tk.NORMAL)
        else:
            self.backend_status_label.config(text="Stopped", foreground="red")
            self.backend_start_btn.config(state=tk.NORMAL)
            self.backend_stop_btn.config(state=tk.DISABLED)
            self.backend_restart_btn.config(state=tk.NORMAL)

        # Frontend
        if frontend_running:
            self.frontend_status_label.config(text="Running", foreground="green")
            self.frontend_start_btn.config(state=tk.DISABLED)
            self.frontend_stop_btn.config(state=tk.NORMAL)
            self.frontend_restart_btn.config(state=tk.NORMAL)
        else:
            self.frontend_status_label.config(text="Stopped", foreground="red")
            self.frontend_start_btn.config(state=tk.NORMAL)
            self.frontend_stop_btn.config(state=tk.DISABLED)
            self.frontend_restart_btn.config(state=tk.NORMAL)

    def start_backend_threaded(self):
        """Start backend in background thread"""
        logger.info("Start backend button clicked")
        Thread(target=self.start_backend, daemon=True).start()

    def start_backend(self):
        """Start backend service"""
        logger.info(f"Starting backend from: {self.backend_path}")
        try:
            with self.lock:
                if self.backend_process and self.backend_process.poll() is None:
                    logger.warning("Backend already running")
                    return
                logger.info("Spawning backend process")
                npm_cmd = 'npm.cmd' if sys.platform == 'win32' else 'npm'
                self.backend_process = subprocess.Popen(
                    [npm_cmd, 'run', 'dev'],
                    cwd=self.backend_path,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    shell=sys.platform == 'win32',
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == 'win32' else 0
                )
                logger.info(f"Backend process started with PID: {self.backend_process.pid}")
                time.sleep(1)
                self.refresh_processes()
        except Exception as e:
            logger.error(f"Failed to start backend: {e}", exc_info=True)
            error_msg = str(e)
            self.root.after(0, lambda msg=error_msg: messagebox.showerror("Error", f"Failed to start backend: {msg}"))

    def stop_backend_threaded(self):
        """Stop backend in background thread"""
        logger.info("Stop backend button clicked")
        Thread(target=self.stop_backend, daemon=True).start()

    def stop_backend(self):
        """Stop backend service"""
        logger.info("Stopping backend")
        try:
            with self.lock:
                if self.backend_process and self.backend_process.poll() is None:
                    logger.info(f"Terminating backend process (PID: {self.backend_process.pid})")
                    self.backend_process.terminate()
                    try:
                        self.backend_process.wait(timeout=3)
                        logger.info("Backend process terminated")
                    except subprocess.TimeoutExpired:
                        logger.warning("Backend didn't terminate, killing it")
                        self.backend_process.kill()
                else:
                    logger.info("Backend process not running")
                self.backend_process = None
                time.sleep(1)
                self.refresh_processes()
        except Exception as e:
            logger.error(f"Failed to stop backend: {e}", exc_info=True)
            error_msg = str(e)
            self.root.after(0, lambda msg=error_msg: messagebox.showerror("Error", f"Failed to stop backend: {msg}"))

    def restart_backend_threaded(self):
        """Restart backend in background thread"""
        logger.info("Restart backend button clicked")
        Thread(target=self.restart_backend, daemon=True).start()

    def restart_backend(self):
        """Restart backend service"""
        logger.info("Restarting backend")
        self.stop_backend()
        time.sleep(1)
        self.start_backend()

    def start_frontend_threaded(self):
        """Start frontend in background thread"""
        logger.info("Start frontend button clicked")
        Thread(target=self.start_frontend, daemon=True).start()

    def start_frontend(self):
        """Start frontend service"""
        logger.info(f"Starting frontend from: {self.frontend_path}")
        try:
            with self.lock:
                if self.frontend_process and self.frontend_process.poll() is None:
                    logger.warning("Frontend already running")
                    return
                logger.info("Spawning frontend process")
                npm_cmd = 'npm.cmd' if sys.platform == 'win32' else 'npm'
                self.frontend_process = subprocess.Popen(
                    [npm_cmd, 'run', 'dev'],
                    cwd=self.frontend_path,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    shell=sys.platform == 'win32',
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == 'win32' else 0
                )
                logger.info(f"Frontend process started with PID: {self.frontend_process.pid}")
                time.sleep(1)
                self.refresh_processes()
        except Exception as e:
            logger.error(f"Failed to start frontend: {e}", exc_info=True)
            error_msg = str(e)
            self.root.after(0, lambda msg=error_msg: messagebox.showerror("Error", f"Failed to start frontend: {msg}"))

    def stop_frontend_threaded(self):
        """Stop frontend in background thread"""
        logger.info("Stop frontend button clicked")
        Thread(target=self.stop_frontend, daemon=True).start()

    def stop_frontend(self):
        """Stop frontend service"""
        logger.info("Stopping frontend")
        try:
            with self.lock:
                if self.frontend_process and self.frontend_process.poll() is None:
                    logger.info(f"Terminating frontend process (PID: {self.frontend_process.pid})")
                    self.frontend_process.terminate()
                    try:
                        self.frontend_process.wait(timeout=3)
                        logger.info("Frontend process terminated")
                    except subprocess.TimeoutExpired:
                        logger.warning("Frontend didn't terminate, killing it")
                        self.frontend_process.kill()
                else:
                    logger.info("Frontend process not running")
                self.frontend_process = None
                time.sleep(1)
                self.refresh_processes()
        except Exception as e:
            logger.error(f"Failed to stop frontend: {e}", exc_info=True)
            error_msg = str(e)
            self.root.after(0, lambda msg=error_msg: messagebox.showerror("Error", f"Failed to stop frontend: {msg}"))

    def restart_frontend_threaded(self):
        """Restart frontend in background thread"""
        logger.info("Restart frontend button clicked")
        Thread(target=self.restart_frontend, daemon=True).start()

    def restart_frontend(self):
        """Restart frontend service"""
        logger.info("Restarting frontend")
        self.stop_frontend()
        time.sleep(1)
        self.start_frontend()

    def start_all_threaded(self):
        """Start all services in background thread"""
        logger.info("Start all button clicked")
        Thread(target=self.start_all, daemon=True).start()

    def start_all(self):
        """Start all services"""
        logger.info("Starting all services")
        self.start_backend()
        time.sleep(1)
        self.start_frontend()

    def stop_all_threaded(self):
        """Stop all services in background thread"""
        logger.info("Stop all button clicked")
        Thread(target=self.stop_all, daemon=True).start()

    def stop_all(self):
        """Stop all services"""
        logger.info("Stopping all services")
        self.stop_backend()
        self.stop_frontend()

    def restart_all_threaded(self):
        """Restart all services in background thread"""
        logger.info("Restart all button clicked")
        Thread(target=self.restart_all, daemon=True).start()

    def restart_all(self):
        """Restart all services"""
        logger.info("Restarting all services")
        self.stop_all()
        time.sleep(2)
        self.start_all()

    def on_exit(self):
        """Exit and cleanup"""
        logger.info("Exit requested")
        if messagebox.askyesno("Confirm", "Stop all services and exit?"):
            logger.info("Stopping services and exiting")
            self.status_checker_active = False
            self.stop_all()
            logger.info("ServiceManager exiting")
            self.root.destroy()

if __name__ == '__main__':
    try:
        root = tk.Tk()
        app = ServiceManager(root)
        root.mainloop()
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        print(f"Fatal error: {e}")
