// First, retrieve the root element, as we will later store the scroll calculation results in CSS variables within :root.
// ChatGPT helped me organise and name these variables, as well as guiding me in writing the sine function and time intervals.
const root = document.documentElement;

//The core task of this JavaScript section is to translate the distance scrolled into visual feedback. The page has no clickable menus, no drag-and-drop functionality, and no complex navigation; scrolling is the sole means of control. The `update()` function calculates the current scroll percentage, then breaks this down into several stages: zoom, explode, driver, noise and return. It writes the corresponding values into CSS variables, which in turn control the position, size, opacity and rotation of the SVG elements. This approach offers a key advantage: the animation does not play automatically; it follows the user’s hand movements directly, allowing the user to set the pace themselves.
//Each stage features distinct visual changes. It begins with the complete headphones, followed by a cutaway and disassembly. During the ‘driver’ stage, the red core is highlighted; in the ‘Noise Control’ stage, the background darkens, and sound waves appear; finally, the components fade out, and the headphones return to their complete state. The text also changes in sync with each stage, ensuring the user always knows where they are in the product’s journey.
//If this prototype were to be incorporated into a larger project in the future, its advantage would be that it is more visually striking and memorable, and is better at capturing attention than a standard parameter table. The challenges are also very practical: the scrolling rhythm requires careful fine-tuning; too many elements may cause frame drops on low-performance devices; and too little explanatory text may leave users unsure of what each component is. In future, we could add a responsive layout, keyboard navigation support, and a reduced-motion version to ensure this effect works smoothly across a wider range of devices and user preferences.

// These DOM nodes contain content that needs to be updated when scrolling; they are cached in advance to avoid repeated queries.
const copyPanel = document.querySelector(".copy-panel");
const stepText = document.querySelector("#stepText");
const titleText = document.querySelector("#titleText");
const bodyText = document.querySelector("#bodyText");
const modeText = document.querySelector("#modeText");
const noiseWave = document.querySelector("#noiseWave");

const cancelWave = document.querySelector("#cancelWave");
const quietWave = document.querySelector("#quietWave");
// slides: centralise the management of the copy for each stage; subsequently, you can switch between them simply by using the index, without needing to write numerous if statements.
const slides = [
  {
    step: "01 / EXTERIOR",
    title: "AudioCore X1",
    body: "Surface to sound. Scroll to open the product layer by layer.",
    mode: "SCROLL"
  },
  {
    step: "02 / CROP",
    title: "Crop + Zoom",
    body: "The view moves closer. The product becomes the path into itself.",
    mode: "MOVE IN"
  },
  {
    step: "03 / PULL APART",
    title: "Pull Apart",
    body: "The earcup opens slowly. Each layer keeps its place in the system.",
    mode: "OPEN"
  },

  {
    step: "04 / DRIVER",
    title: "Red Core",
    body: "The driver turns into the centre point of the whole object.",
    mode: "ROTATE"
  },
  {
    step: "05 / NOISE",
    title: "Noise Control",
    body: "Sound changes shape. Chaos is pulled into a quieter line.",
    mode: "TRANSFORM"
  },

  {
    step: "06 / COMPLETE",
    title: "Complete Product",
    body: "The parts return. One object again, but now with its inside revealed.",
    mode: "REASSEMBLE"
  }
];

// Records the current stage to prevent the text replacement animation from being triggered repeatedly within the same stage.
let currentSlide = 0;

function clamp(value, min, max) {
  // `clamp` is used to restrict the range, ensuring that the progress value does not fall below 0 or exceed 1 when scrolling to the edge.
  return Math.min(Math.max(value, min), max);
}


// range Split the overall scroll progress into local segments
function range(progress, start, end) {
  return clamp((progress - start) / (end - start), 0, 1);
}

// Smoothstep makes the start and end of animations smoother, so they don’t start or stop abruptly like a linear transition.
function smooth(value) {
  return value * value * (3 - 2 * value);
}

//  a sawtooth waveform is generated using sine waves; the higher the `flatten` value, the closer the waveform resembles a flat line.
function makeWave(startX, endX, y, amp, tightness, flatten) {
  let path = `M ${startX} ${y}`;
  const steps = 26;

  for (let i = 1; i <= steps; i++) {
    const x = startX + ((endX - startX) / steps) * i;
    const local = Math.sin(i * tightness) * amp * (1 - flatten);
    const drift = Math.sin(i * .45) * amp * .24 * (1 - flatten);
    path += ` L ${x.toFixed(1)} ${(y + local + drift).toFixed(1)}`;
  }


  return path;
}

function setSlide(index) {
  // If the website still on the same page, simply return to it to avoid the text flickering.
  if (index === currentSlide) return;
  currentSlide = index;
  copyPanel.classList.add("is-changing");

  setTimeout(() => {
    // Wait until the fade-out animation has started before replacing the text.
    const slide = slides[index];
    stepText.textContent = slide.step;
    titleText.textContent = slide.title;
    bodyText.textContent = slide.body;
    modeText.textContent = slide.mode;
    copyPanel.classList.remove("is-changing");
  }, 120);
}

// Convert the current scroll distance into a progress value ranging from 0 to 1; this is the core input for the entire page animation.
function update() {
  const maxScroll = document.body.scrollHeight - window.innerHeight;
  const p = maxScroll > 0 ? window.scrollY / maxScroll : 0;

  // Each variable corresponds to a visual stage; as the time intervals differ, the animations will play out in sequence.
  const zoom = smooth(range(p, .08, .24));
  const explode = smooth(range(p, .24, .46));
  const driver = smooth(range(p, .46, .64)) * (1 - range(p, .70, .78));
  const noise = smooth(range(p, .64, .80)) * (1 - range(p, .88, .98));

  const rejoin = smooth(range(p, .82, .98));
  const darkIn = smooth(range(p, .62, .72));
  const darkOut = smooth(range(p, .88, .98));
  const dark = clamp(darkIn - darkOut, 0, 1);
  const crop = zoom * (1 - explode) * (1 - rejoin);
  const parts = clamp(explode + driver * .4, 0, 1) * (1 - rejoin);

  // JS is only responsible for the calculations; the actual movement, opacity and colour changes are all handled via CSS variables.
  root.style.setProperty("--progress", p.toFixed(4));
  root.style.setProperty("--zoom", zoom.toFixed(4));
  root.style.setProperty("--explode", explode.toFixed(4));
  root.style.setProperty("--driver", driver.toFixed(4));

  root.style.setProperty("--noise", noise.toFixed(4));
  root.style.setProperty("--return", rejoin.toFixed(4));
  root.style.setProperty("--dark", dark.toFixed(4));
  root.style.setProperty("--crop", crop.toFixed(4));
  root.style.setProperty("--parts", parts.toFixed(4));



  const slideIndex = clamp(Math.floor(p * slides.length), 0, slides.length - 1);
  setSlide(slideIndex);

  // The waveform scrolls and is redrawn in real time; as the ‘flatten’ value increases, the noise line gradually flattens out.
  const flatten = smooth(range(p, .70, .82));
  noiseWave.setAttribute("d", makeWave(135, 505, 485, 46, 1.15, flatten * .35));
  cancelWave.setAttribute("d", makeWave(510, 820, 485, 36, 1.45, flatten * .55));
  quietWave.setAttribute("d", makeWave(815, 1080, 485, 22, .75, flatten));
}

// passive: true tells the browser that scroll events will not prevent the default behaviour, resulting in smoother page scrolling.
window.addEventListener("scroll", update, { passive: true });
window.addEventListener("resize", update);
// Execute this once when the page first loads to ensure that the visual state is correct even if the page is refreshed or accessed partway through.

update();
