const header = document.querySelector('[data-header]');
const navToggle = document.querySelector('[data-nav-toggle]');
const navMenu = document.querySelector('[data-nav]');
const navLinks = document.querySelectorAll('[data-nav] a');
const scrollVideo = document.querySelector('[data-scroll-video]');
const scrollCanvas = document.querySelector('[data-scroll-frames]');
const scrollVideoWrap = scrollVideo?.closest('.scroll-video-backdrop');
let videoCanScrub = false;
let frameCanScrub = false;
let rafPending = false;
let scrollFrames = [];
let canvasContext = null;

const closeMenu = () => {
  if (!navToggle || !navMenu) return;
  navToggle.setAttribute('aria-expanded', 'false');
  navMenu.classList.remove('open');
  header?.classList.remove('menu-open');
  document.body.classList.remove('nav-open');
};

const updateHeader = () => {
  header?.classList.toggle('scrolled', window.scrollY > 24);
};

const updateScrollVideo = () => {
  rafPending = false;

  if (frameCanScrub && scrollCanvas && canvasContext && scrollFrames.length) {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    const frameIndex = Math.min(
      scrollFrames.length - 1,
      Math.max(0, Math.round(progress * (scrollFrames.length - 1)))
    );

    drawScrollFrame(scrollFrames[frameIndex]);
    return;
  }

  if (!scrollVideo || !videoCanScrub || !Number.isFinite(scrollVideo.duration)) return;

  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  const targetTime = Math.min(scrollVideo.duration - 0.05, Math.max(0, progress * scrollVideo.duration));

  if (Math.abs(scrollVideo.currentTime - targetTime) > 0.04) {
    scrollVideo.currentTime = targetTime;
  }
};

const requestScrollVideoUpdate = () => {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(updateScrollVideo);
};

if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    const willOpen = navToggle.getAttribute('aria-expanded') !== 'true';
    navToggle.setAttribute('aria-expanded', String(willOpen));
    navMenu.classList.toggle('open', willOpen);
    header?.classList.toggle('menu-open', willOpen);
    document.body.classList.toggle('nav-open', willOpen);
  });
}

navLinks.forEach((link) => link.addEventListener('click', closeMenu));
window.addEventListener('scroll', () => {
  updateHeader();
  requestScrollVideoUpdate();
}, { passive: true });
window.addEventListener('resize', () => {
  if (window.innerWidth > 900) closeMenu();
  resizeScrollCanvas();
  requestScrollVideoUpdate();
});

const loadImage = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = reject;
  image.src = src;
});

const loadScrollFrame = async (index) => {
  const padded = String(index).padStart(3, '0');
  const extensions = ['jpg', 'png', 'webp'];
  const nameVariants = [`frame-${padded}`, `frame-${padded} (2)`];

  for (const name of nameVariants) {
    for (const extension of extensions) {
      try {
        return await loadImage(`assets/scroll-frames/${name}.${extension}`);
      } catch {
        // Try the next supported image type or duplicate filename variant.
      }
    }
  }

  return null;
};

const drawScrollFrame = (image) => {
  if (!scrollCanvas || !canvasContext || !image) return;

  const canvasRatio = scrollCanvas.width / scrollCanvas.height;
  const imageRatio = image.naturalWidth / image.naturalHeight;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;
  let sourceX = 0;
  let sourceY = 0;

  if (imageRatio > canvasRatio) {
    sourceWidth = image.naturalHeight * canvasRatio;
    sourceX = (image.naturalWidth - sourceWidth) / 2;
  } else {
    sourceHeight = image.naturalWidth / canvasRatio;
    sourceY = (image.naturalHeight - sourceHeight) / 2;
  }

  canvasContext.clearRect(0, 0, scrollCanvas.width, scrollCanvas.height);
  canvasContext.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    scrollCanvas.width,
    scrollCanvas.height
  );
};

const resizeScrollCanvas = () => {
  if (!scrollCanvas) return;

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.round(window.innerWidth * pixelRatio);
  const height = Math.round(window.innerHeight * pixelRatio);

  if (scrollCanvas.width !== width || scrollCanvas.height !== height) {
    scrollCanvas.width = width;
    scrollCanvas.height = height;
    requestScrollVideoUpdate();
  }
};

const loadScrollFrames = async () => {
  if (!scrollCanvas) return;

  canvasContext = scrollCanvas.getContext('2d');
  resizeScrollCanvas();

  const loadedFrames = [];
  const maxFrames = 180;

  for (let index = 1; index <= maxFrames; index += 1) {
    const image = await loadScrollFrame(index);

    if (!image) {
      break;
    }

    loadedFrames.push(image);
  }

  if (!loadedFrames.length) return;

  scrollFrames = loadedFrames;
  frameCanScrub = true;
  videoCanScrub = false;
  scrollVideoWrap?.classList.add('frames-ready');
  updateScrollVideo();
};

if (scrollVideo) {
  const enableScrollVideo = () => {
    videoCanScrub = true;
    scrollVideoWrap?.classList.add('ready');
    updateScrollVideo();
  };

  scrollVideo.addEventListener('loadedmetadata', enableScrollVideo);

  scrollVideo.addEventListener('error', () => {
    scrollVideoWrap?.classList.add('fallback');
  });

  if (scrollVideo.readyState >= 1) {
    enableScrollVideo();
  } else {
    scrollVideo.load();
  }
}

loadScrollFrames();
updateHeader();
