# The Complete 100% Free Autonomous Workstation Setup (128GB M5 Max)

This is the finalized, production-ready configuration to turn your 128GB M5 Max MacBook Pro into a completely free, local AI powerhouse.

By utilizing Alibaba's **Qwen 3 Coder Next (80B MoE)** for blazing-fast code generation (~65+ tokens/sec) and Google's unquantized **Gemma 4 (31B Dense)** for structural vision and Playwright scraping tasks, you gain an elite offline environment. It includes a completely free Google Cloud fallback tier for massive 2-million token codebase debugging loops.

***

### 📦 Step 1: Install the Hardware Engines & Native 16-Bit Models

Open the built-in terminal window directly inside your JetBrains IDE (Rider or GoLand) by pressing `Cmd + F12` (or `Alt + F12`) and deploy the background services and unquantized models:

```bash
# Install Ollama via Homebrew
brew install ollama

# Pull the flagship open-weight 16-bit agentic coding model (80B total / 3B active parameters)
ollama pull qwen3-coder-next:80b-fp16

# Pull the unquantized 16-bit version of Google's flagship multimodal reasoning model
ollama pull gemma4:31b-instruct-fp16
```

***

### 🔑 Step 2: Grab the Free Google Developer Key

To ensure you can handle massive repository overhauls or deep, confusing bugs without ever paying for tokens:

1. Go to [Google AI Studio](https://google.com) and generate a free API key.
2. This unlocks access to Gemini's massive 2-million token context window entirely for free to handle your deepest debugging loops.

***

### ⚙️ Step 3: Apply the Perfect `opencode.json` File

Create or overwrite your global OpenCode configuration file located at `~/.config/opencode/opencode.json`. This configuration routes OpenCode directly through your laptop's unquantized local hardware VRAM pool while mapping your free Google cloud escape hatch.

```json
{
  "default_provider": "local",
  "providers": {
    "local": {
      "url": "http://localhost:11434/v1",
      "default_model": "qwen3-coder-next:80b-fp16",
      "temperature": 0.0,
      "max_tokens": 131072,
      "sub_agent_settings": {
        "allow_bash_execution": true,
        "compiler_retry_limit": 5,
        "model": "qwen3-coder-next:80b-fp16"
      }
    },
    "local_gemma_vision": {
      "url": "http://localhost:11434/v1",
      "default_model": "gemma4:31b-instruct-fp16",
      "temperature": 0.0,
      "max_tokens": 65536,
      "sub_agent_settings": {
        "allow_bash_execution": true,
        "compiler_retry_limit": 3,
        "model": "gemma4:31b-instruct-fp16"
      }
    },
    "google": {
      "url": "https://googleapis.com",
      "api_key": "PASTE_YOUR_FREE_GOOGLE_AI_STUDIO_KEY_HERE",
      "default_model": "gemini-2.5-pro",
      "temperature": 0.2
    }
  }
}
```

***

### 📑 Step 4: Map and Lock Your Architecture Boundaries

Navigate to your active project repository directory and initialize your workspace mapping:

```bash
opencode /init
```

This generates an interactive memory map file called `agents.md` (or `OpenCode.md`) in your project root. Open it and paste these exact prompts to enable conditional base repository editing:

```markdown
# Strict Engineering Rules
- System Role: You are a deterministic execution sub-agent running on an unquantized local engine.
- Style Guideline: Match the exact namespace spacing, type definitions, and structural formatting of the target files.
- Testing Requirement: You are forbidden from closing a task until the local compiler test suite runs completely clean.

# Base Repository Modification Protocol (Mandatory)
1. You are allowed to suggest modifications to the base repository or core architectural layers.
2. CRITICAL: You are strictly forbidden from modifying any base files during the initial processing phase.
3. Before changing a base file, you must explicitly present a proposal detailing:
   - The specific file names and line numbers to be altered.
   - The exact structural modifications proposed.
   - A clear explanation of WHY this alteration is better (e.g., preventing duplication, fixing memory leaks, or ensuring architectural uniformity).
4. Wait for explicit developer authorization in the terminal before moving the plan into Build Mode.
```

***

### 🚀 Step 5: Critical Power-User Additions for 128GB Macs

#### 1. Maximize macOS Memory Allocations
By default, macOS caps the amount of VRAM a single application can claim to prevent system hangs. Because you are running massive unquantized models with heavy context extensions, force your system to unlock your hardware capabilities. Run this command globally in your Mac terminal:

```bash
sudo sysctl -w iogpu.wired_mem_limit=111669149696
```
*(This forces macOS to permit Ollama to allocate up to 104GB of unified memory safely without triggering system limits).*

#### 2. Setup the Git Panic-Button Alias
When letting sub-agents vibe-code, they can make structural mistakes. To instantly wipe bad edits and clean your branch with a single command, open your terminal profile (`~/.zshrc`) and add this alias:

```bash
alias vibeabort="git reset --hard HEAD && git clean -fd"
```
Run `source ~/.zshrc` to activate it. If an agentic loop goes off the rails, type `vibeabort` to reset your workspace.

#### 3. Verify Local Compiler Access
Run these two commands in your Mac terminal to verify that your system can see your compilers instantly:

```bash
go version
dotnet --version
```

***

### 🖥️ Managing the Hands-Off Workflow In the Terminal

Run the execution framework by opening your terminal tool:
```bash
opencode
```

* **The Hands-Off Vibe Session:** OpenCode boots into the local `qwen3-coder-next:80b-fp16` model by default. Hit the **Tab** key to enter **Plan Mode**. Describe what you want built broadly:
  > *"Vibe code an asynchronous multi-page ingestion system into our Playwright scraper module."*
* **The Refactoring Proposal Loop:** Qwen 3 Coder Next's planning sub-agents will read your project files. If it notices that changing a base Go struct or a C# base repository abstraction would result in better optimization or prevent code duplication, it will output its custom justification details directly into your terminal interface, explaining why its strategy is superior.
* **The Agentic Takeover:** Review its reasoning. If you approve of its architectural logic, hit **Tab** to toggle OpenCode into **Build Mode** and press **Enter**. The sub-agents take over completely. They will rewrite the base configurations, create the implementations, call `go test` or `dotnet build` in a hidden shell, fix any syntax errors automatically, and hand control back to you once your entire codebase compiles cleanly.
* **Pivoting to local Vision / Playwright:** If your Playwright script needs to inspect dynamic web states visually or handle unstructured layout arrays, run `/provider local_gemma_vision`. Because Gemma 4 features a built-in, encoder-free vision layer, you can pass raw page screenshots directly into the prompt window to extract elements with total layout accuracy.
* **The Cloud Surge:** If an obscure compilation bug stumps your local hardware, type `/provider google` to instantly shift the active session to your free cloud token pool to let the model solve the architecture issue.

***