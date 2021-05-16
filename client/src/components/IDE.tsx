import { useEffect, useState, useRef, useCallback } from 'react';
import postData from '../helpers/utils.js';
import { basicSetup } from "@codemirror/basic-setup";
import { EditorState } from "@codemirror/state";
import { defaultTabBinding } from "@codemirror/commands";
import { EditorView, keymap } from "@codemirror/view";
import { cpp } from "@codemirror/lang-cpp";

const API = process.env.REACT_APP_API;
let view: any;
const IDE = () => {
  const [code, setCode] = useState('#include <iostream>\n\nusing namespace std;\n\nint main() {\n  cout << "Hello, World!" << endl;\n}');
  const [stdout, setStdout] = useState('');
  const [stderr, setStderr] = useState('');
  const [error, setError] = useState('');
  const [id, setId] = useState(null);
  const [status, setStatus] = useState('');
  const [input, setInput] = useState('');

  const update = useCallback(() => {
    if (id) {
      const source = new EventSource(API + '/' + id);
      source.addEventListener('message', msg => {
        const data = JSON.parse(msg.data);
        console.log(data);
        if (data.status === 'completed') {
          setStdout(data.data.stdout);
          setStderr(data.data.stderr);
          setError(data.data.err);
          setStatus("Completed");
          setId(null);
        } else if (data.status === 'running') {
          setStatus('Running');
        }
      });
    }
  }, [id])

  useEffect(() => {
    update();
  }, [id, update]);

  useEffect(() => {
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
  }, []);

  const editor = useRef() as React.MutableRefObject<HTMLInputElement>;

  useEffect(() => {
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
    console.log(state);
    console.log(view.state);
    return () => {
      view.destroy();
    };
  }, []);

  const handleSubmit = (event: any) => {
    event.preventDefault();
    setCode(view.state.doc.toString());
    setStatus("Uploading")
    postData(API + "/create", {
      code: view.state.doc.toString(),
      input: input
    }).then(
      (result) => {
        setStatus("Uploaded");
        setId(result._id);
      }
    );
  };

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
                <div ref={editor} style={{height: "80vh"}}></div>
                <div className="submit">
                  <input type="submit" value="Run" onClick={handleSubmit}></input>
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