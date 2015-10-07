const viewport = require('viewport')

const onMouseEnter = (e, {tip_options}, dom) => {
  dom.tip = new Engine(tip_options.content, dom, tip_options)
  dom.tip.show()
}

const onMouseLeave = (e, node, {tip}) => tip.hide()

/////
// Bind a tool tip to be displayed around a target node when the user
// hovers their mouse over it. It will automatically choose the best
// position depending on where room is availabe in the viewport
//
// @param  {VirtualElement} target
// @param  {Object} options
// @return {target}
//
const bindTip = (target, options) => {
  target = addEvents(target, {
    onMount(dom, node) {
      if (options.show === true) onMouseEnter(null, node, dom)
    },
    onUnMount({tip}) {
      tip && tip.hide()
    }
  })
  if (options.show !== true) {
    options.content = addEvents(options.content, {
      onMouseEnter(e, node, {tip}) { tip.show() },
      onMouseLeave
    })
    target = target.mergeParams({onMouseEnter, onMouseLeave})
  }
  target.tip_options = options
  return target
}

const addEvents = (node, events) => {
  node = Object.create(node)
  node.events = Object.create(node.events)
  return node.mergeParams(events)
}

/////
// Provides an API for use in JSX
//
const Tip = (options, [target]) => bindTip(target, options)

/////
// Posible positions are
//
// - `top`
// - `top-left`
// - `top-right`
// - `bottom`
// - `bottom-left`
// - `bottom-right`
// - `left`
// - `left-top`
// - `left-bottom`
// - `right`
// - `right-top`
// - `right-bottom`
//
class Engine {
  constructor(node, target, {position='top',
                             effect='fade',
                             padding=10,
                             delay=300,
                             auto=true}) {
    this.target = target
    this.node = node.mergeParams({class: 'tip'})
    if (effect) node.mergeParams({class: effect})
    this.position = position.replace(/\s+/g, '-')
    this.pad = padding
    this.auto = auto
    this.delay = effect == null ? 0 : delay
  }

  show() {
    clearTimeout(this._hide)
    if (this.binding) return this.el.classList.remove('tip-hide')

    this.el = this.node.toDOM()
    this.el.tip = this
    this.el.classList.add('tip-hide')
    document.body.appendChild(this.el)
    // defer so animations css animations can work
    requestAnimationFrame(() => {
      this.el.classList.remove('tip-hide')
    })
    this.reposition(viewport.value)
    this.binding = viewport.addListener(port => {
      if (this.el) this.reposition(port)
    })
  }

  reposition(port) {
    const pos = this.auto ? this.suggested(this.position) : this.position
    this.replaceClass(pos)
    const {top,left} = this.offset(pos)
    this.el.style.top = port.top + top + 'px'
    this.el.style.left = port.left + left + 'px'
  }

  replaceClass(pos) {
    if (this.currentPosition == pos) return
    if (this.currentPosition) this.el.classList.remove(this.currentPosition)
    this.currentPosition = `tip-${pos}`
    this.el.classList.add(this.currentPosition)
  }

  /////
  // Compute the "suggested" position favouring `pos`.
  //
  // Returns `pos` if no suggestion can be determined.
  //
  // @param {String} pos
  // @param {Object} offset
  // @return {String}
  //
  suggested(pos) {
    const target = this.target.getBoundingClientRect()
    const h = this.el.clientHeight
    const w = this.el.clientWidth
    const port = viewport.value

    // see where we have spare room
    const room = {
      top: target.top - h - this.pad,
      bottom: port.height - target.bottom - h - this.pad,
      left: target.left - w - this.pad,
      right: port.width - target.right - w - this.pad
    }

    const positions = pos.split('-')
    const primary = choosePrimary(positions[0], room)
    return chooseSecondary(primary, positions[1], this, w, h) || pos
  }

  /////
  // Compute the offset for `.target` based on the given `pos`
  //
  // @param {String} pos
  // @return {Object}
  //
  offset(pos) {
    const pad = this.pad
    const tipRect = this.el.getBoundingClientRect()
    const ew = tipRect.width
    const eh = tipRect.height
    const targetRect = this.target.getBoundingClientRect()
    const tw = targetRect.width
    const th = targetRect.height

    switch (pos) {
      case 'top':
        return {
          top: targetRect.top - eh - pad,
          left: targetRect.left + tw / 2 - ew / 2
        }
      case 'bottom':
        return {
          top: targetRect.top + th + pad,
          left: targetRect.left + tw / 2 - ew / 2
        }
      case 'right':
        return {
          top: targetRect.top + th / 2 - eh / 2,
          left: targetRect.left + tw + pad
        }
      case 'left':
        return {
          top: targetRect.top + th / 2 - eh / 2,
          left: targetRect.left - ew - pad
        }
      case 'top-left':
        return {
          top: targetRect.top - eh - pad,
          left: targetRect.left + tw / 2 - ew
        }
      case 'top-right':
        return {
          top: targetRect.top - eh - pad,
          left: targetRect.left + tw / 2
        }
      case 'bottom-left':
        return {
          top: targetRect.top + th + pad,
          left: targetRect.left + tw / 2 - ew
        }
      case 'bottom-right':
        return {
          top: targetRect.top + th + pad,
          left: targetRect.left + tw / 2
        }
      case 'left-top':
        return {
          top: targetRect.top + th / 2 - eh,
          left: targetRect.left - ew - pad
        }
      case 'left-bottom':
        return {
          top: targetRect.top + th / 2,
          left: targetRect.left - ew - pad
        }
      case 'right-top':
        return {
          top: targetRect.top + th / 2 - eh,
          left: targetRect.left + tw + pad
        }
      case 'right-bottom':
        return {
          top: targetRect.top + th / 2,
          left: targetRect.left + tw + pad
        }
      default:
        throw new Error('invalid position "' + pos + '"')
    }
  }

  hide() {
    this.el.classList.add('tip-hide')
    if (this.delay) {
      this._hide = setTimeout((() => this.remove()), this.delay)
    } else {
      this.remove()
    }
  }

  remove() {
    let parent = this.el.parentNode
    if (parent) parent.removeChild(this.el)
    viewport.removeListener(this.binding)
    this.binding = null
  }
}

const choosePrimary = (prefered, room) => {
  // top, bottom, left, right in order of preference
  const order = [prefered, opposite[prefered], adjacent[prefered], opposite[adjacent[prefered]]]
  var best = -Infinity
  var bestPos
  for (var i = 0, len = order.length; i < len; i++) {
    var prefered = order[i]
    var space = room[prefered]
    // the first side it fits completely
    if (space > 0) return prefered
    // less chopped of than other sides
    if (space > best) best = space, bestPos = prefered
  }
  return bestPos
}

const chooseSecondary = (primary, prefered, tip, w, h) => {
  // top, top-left, top-right in order of preference
  var order = prefered
    ? [primary + '-' + prefered, primary, primary + '-' + opposite[prefered]]
    : [primary, primary + '-' + adjacent[primary], primary + '-' + opposite[adjacent[primary]]]
  var port = viewport.value
  var bestPos
  var best = 0
  var max = w * h
  for (var i = 0, len = order.length; i < len; i++) {
    var pos = order[i]
    var off = tip.offset(pos)
    var offBottom = port.height - h - off.top
    var offRight = port.width - w - off.left
    var yVisible = h
    if (off.top < 0) yVisible -= off.top
    if (offBottom < 0) yVisible -= offBottom
    var xVisible = w
    if (off.left < 0) xVisible -= off.left
    if (offRight < 0) xVisible -= offRight
    var area = Math.max(xVisible, 0) * Math.max(yVisible, 0)
    // the first position that shows all the tip
    if (area == max) return pos
    // shows more of the tip than the other positions
    if (area > best) best = area, bestPos = pos
  }
  return bestPos
}

const opposite = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left'
}

const adjacent = {
  top: 'right',
  left: 'top',
  bottom: 'left',
  right: 'bottom'
}

export default Tip
export {bindTip,Tip,Engine}
