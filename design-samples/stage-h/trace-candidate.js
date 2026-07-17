(() => {
  const canvas = document.querySelector('.ink-canvas')
  const wrap = document.querySelector('.writing-wrap')
  const clearButton = document.querySelector('.clear-ink')
  const finishButton = document.querySelector('.finish-trace')
  const replayButton = document.querySelector('.listen-again')
  const context = canvas.getContext('2d')
  const scale = canvas.width / canvas.getBoundingClientRect().width
  let drawing = false
  let strokes = 0
  let complete = false

  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.strokeStyle = '#e77f94'
  context.lineWidth = 18 * scale

  function statePayload() {
    return {
      coordinateSystem: '1194x834 logical stage; origin top-left; x right; y down',
      screen: complete ? 'trace_complete' : 'trace_ready',
      word: 'egg',
      writingGuide: 'four lines / three spaces',
      templateVisible: !complete,
      handwritingStrokeCount: strokes,
      controls: ['back', 'replay_word', 'clear_ink', 'complete_trace'],
    }
  }

  function syncState() {
    document.body.dataset.gameState = JSON.stringify(statePayload())
  }

  function point(event) {
    const bounds = canvas.getBoundingClientRect()
    return { x: (event.clientX - bounds.left) * scale, y: (event.clientY - bounds.top) * scale }
  }

  function begin(event) {
    drawing = true
    complete = false
    wrap.classList.remove('is-complete')
    canvas.setPointerCapture(event.pointerId)
    const next = point(event)
    context.beginPath()
    context.moveTo(next.x, next.y)
    wrap.classList.add('has-ink')
    wrap.classList.remove('needs-ink')
    syncState()
  }

  function move(event) {
    if (!drawing) return
    const next = point(event)
    context.lineTo(next.x, next.y)
    context.stroke()
  }

  function end(event) {
    if (!drawing) return
    drawing = false
    strokes += 1
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
    syncState()
  }

  function clearInk() {
    context.clearRect(0, 0, canvas.width, canvas.height)
    strokes = 0
    complete = false
    wrap.classList.remove('has-ink', 'is-complete', 'needs-ink')
    syncState()
  }

  function drawSample() {
    clearInk()
    context.save()
    context.fillStyle = '#e77f94'
    context.globalAlpha = .94
    context.font = `900 ${170 * scale}px "Segoe Print", "Comic Sans MS", cursive`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText('egg', canvas.width / 2, canvas.height * .52)
    context.globalAlpha = .18
    context.fillText('egg', canvas.width / 2 + 2 * scale, canvas.height * .52 + 2 * scale)
    context.restore()
    strokes = 3
    complete = true
    wrap.classList.add('has-ink', 'is-complete')
    syncState()
  }

  canvas.addEventListener('pointerdown', begin)
  canvas.addEventListener('pointermove', move)
  canvas.addEventListener('pointerup', end)
  canvas.addEventListener('pointercancel', end)
  clearButton.addEventListener('click', clearInk)
  finishButton.addEventListener('click', () => {
    if (!strokes) {
      wrap.classList.add('needs-ink')
      window.setTimeout(() => wrap.classList.remove('needs-ink'), 480)
      return
    }
    complete = true
    wrap.classList.add('is-complete')
    syncState()
  })
  replayButton.addEventListener('click', () => {
    replayButton.dataset.played = 'true'
  })

  if (new URLSearchParams(window.location.search).get('state') === 'complete') drawSample()

  syncState()

  window.render_game_to_text = () => JSON.stringify(statePayload())
  window.advanceTime = () => undefined
})()
