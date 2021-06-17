import { useEffect, useState, useRef, useCallback } from 'react';
import { basicSetup } from "@codemirror/basic-setup";
import { EditorState } from "@codemirror/state";
import { defaultTabBinding } from "@codemirror/commands";
import { EditorView, keymap } from "@codemirror/view";
import { cpp } from "@codemirror/lang-cpp";
import axios from 'axios';

const API = process.env.REACT_APP_API;
let view: any;

const QUEUED = 'QUEUED';
const RUNNING = 'RUNNING';
const SERVER_CONNECTING = 'SERVER_CONNECTING';
const SERVER_UP = 'SERVER_UP';
const WORKER_UP = 'WORKER_UP';
const UPLOADING = 'UPLOADING';
const UPLOADED = 'UPLOADED';
const RATE_LIMITED = 'RATE_LIMITED';
const COMPLETED = 'COMPLETED';

const statusMessage: any = {
  [QUEUED]: 'Queued',
  [RUNNING]: 'Running',
  [SERVER_CONNECTING]: 'Connecting to Server',
  [SERVER_UP]: 'Connecting to Worker',
  [WORKER_UP]: 'Ready',
  [UPLOADING]: 'Uploading',
  [UPLOADED]: 'Uploaded',
  [RATE_LIMITED]: 'Try again after 10 sec',
  [COMPLETED]: 'Completed'
};

const IDE = () => {
  const [code, setCode] = useState('#include <iostream>\n\nusing namespace std;\n\nint main() {\n  cout << "Hello, World!" << endl;\n}');
  const [stdout, setStdout] = useState('');
  const [stderr, setStderr] = useState('');
  const [error, setError] = useState('');
  const [id, setId] = useState(null);
  const [status, setStatus] = useState(SERVER_CONNECTING);
  const [input, setInput] = useState('');
  const [runDisabled, setRunDisabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorkerConnected, setIsWorkerConnected] = useState(false);
  const [eventStreamId, setEventStreamId] = useState(null);

  useEffect(() => {
    const source = new EventSource(API + '/events');
    source.addEventListener('message', msg => {
      const data = JSON.parse(msg.data);
      console.log(data);
      switch (data.status) {
        case 'QUEUED': case 'RUNNING':
          break;
        case 'SERVER_UP':
          setEventStreamId(data.eventStreamId);
          setIsLoading(false);
          break;
        case 'WORKER_UP':
          setIsWorkerConnected(true);
          break;
        default:
          setStdout(data.stdout);
          setStderr(data.stderr);
          setError(data.err);
          setId(null);
      }
      setStatus(statusMessage[data.status]);
  });
  }, []);

  const editor = useRef() as React.MutableRefObject<HTMLInputElement>;

  useEffect(() => {
    if (!isLoading) {
      var colorLabel = document.getElementById('color');
      var checkbox: any = document.getElementById('color-mode');
      checkbox.addEventListener('change', () => {
        if (colorLabel) {
          if (checkbox?.checked) {
            colorLabel.innerText = "Light";
          } else {
            colorLabel.innerText = "Dark";
          }
        }
      });
    }
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading) {
      const state = EditorState.create({
        doc: code,
        extensions: [
          basicSetup,
          keymap.of([defaultTabBinding]),
          cpp()
        ]
      });
      view = new EditorView({
        state,
        parent: editor.current
      });
      return () => {
        view.destroy();
      };  
    }
  }, [isLoading]);

  const handleSubmit = (event: any) => {
    event.preventDefault();
    if (runDisabled) return;
    setCode(view.state.doc.toString());
    setStatus(statusMessage[UPLOADING]);
    axios.post(API + "/create", {
      code: view.state.doc.toString(),
      input: input,
      eventStreamId: eventStreamId
    }).then((res) => {
        setStatus(statusMessage[UPLOADED]);
        setId(res.data._id);
      }).catch(err => {
        if (err?.response?.status === 429) {
          console.log("hi");
          setStatus(statusMessage[RATE_LIMITED])
          setRunDisabled(true);
          setTimeout(() => {
            setRunDisabled(false);
            setStatus('Ready');
          }, 1000*10);
        }
      });
  };

  if (isLoading) {
    return(
      <div className="loading-screen">Connecting to server...</div>
    )
  }

  return (
    <div>
      <input type="checkbox" id="color-mode"></input>
      <div className="body">
        <div className="main">
          <div className="header">
            <h1 className="heading">IDE</h1>
            <label htmlFor="color-mode" id="color">Dark</label>
          </div>
          <div className="ide">
            <div className="editor">
              <div ref={editor} style={{ height: "80vh" }}></div>
              <div className="submit">
                {
                  isWorkerConnected && <input type="submit" value="Run" onClick={handleSubmit}></input>
                }
                <h4><span id="status">{status}</span></h4>
              </div>
            </div>
            <div className="io">
              <div className="io-block">
                <label htmlFor="input">Input</label>
                <textarea id="input" name="input" onChange={e => setInput(e.target.value)} value={input} />
              </div>
              <div className="io-block">
                <label htmlFor="stdout">stdout</label>
                <textarea id="stdout" name="stdout" onChange={e => setStdout(e.target.value)} value={stdout} />
              </div>
              <div className="io-block">
                <label htmlFor="stderr">stderr</label>
                <textarea id="stderr" name="stderr" onChange={e => setStderr(e.target.value)} value={stderr} />
              </div>
            </div>
          </div>
          <div className="err">
            <label htmlFor="error">Error</label>
            <textarea id="error" onChange={e => setError(e.target.value)} value={error} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default IDE;