const viewport = require('viewport')

const stack = []

const onMouseEnter = (e, {tip_options}, dom) => {
  dom.tip = dom.tip || new Engine(tip_options.content, dom, tip_options)
  if (tip_options.solo) {
    stack.forEach(tip => tip.hide())
    stack.push(dom.tip)
  }
  dom.tip.show()
}

const onMouseLeave = (e, {tip_options}, dom) => {
  dom.tip.hide()
  if (tip_options.solo) {
    stack.pop()
    const end = stack.length - 1
    end >= 0 && stack[end].show()
  }
}

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
    onUnMount(dom, node) {
      dom.tip && onMouseLeave(null, node, dom)
    }
  })
  if (options.show !== true) {
    options.content = addEvents(options.content, {onMouseEnter, onMouseLeave})
    target = target.mergeParams({onMouseEnter, onMouseLeave})
  }
  options.content.tip_options = options
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
    const tipRect = this.el.getBoundingClientRect()
    const targetRect = this.target.getBoundingClientRect()
    const [pos, {top,left}] = this.auto
      ? this.suggested(this.position, tipRect, targetRect)
      : [this.position, this.offset(this.position, tipRect, targetRect)]
    this.replaceClass(pos)
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
  // Compute the offset for `.target` based on the given `pos`
  //
  // @param {String} pos
  // @param {Object} tipRect
  // @param {Object} targetRect
  // @return {Object}
  //
  offset(pos, tipRect, targetRect) {
    const {width: ew, height: eh} = tipRect
    const {width: tw, height: th} = targetRect
    switch (pos) {
      case 'top':
        return {
          top: targetRect.top - eh - this.pad,
          left: targetRect.left + tw / 2 - ew / 2
        }
      case 'bottom':
        return {
          top: targetRect.top + th + this.pad,
          left: targetRect.left + tw / 2 - ew / 2
        }
      case 'right':
        return {
          top: targetRect.top + th / 2 - eh / 2,
          left: targetRect.left + tw + this.pad
        }
      case 'left':
        return {
          top: targetRect.top + th / 2 - eh / 2,
          left: targetRect.left - ew - this.pad
        }
      case 'top-left':
        return {
          top: targetRect.top - eh - this.pad,
          left: targetRect.left + tw / 2 - ew + 20
        }
      case 'top-right':
        return {
          top: targetRect.top - eh - this.pad,
          left: targetRect.left + tw / 2 -18
        }
      case 'bottom-left':
        return {
          top: targetRect.top + th + this.pad,
          left: targetRect.left + tw / 2 - ew + 20
        }
      case 'bottom-right':
        return {
          top: targetRect.top + th + this.pad,
          left: targetRect.left + tw / 2 - 18
        }
      case 'left-top':
        return {
          top: targetRect.top + th / 2 - eh + 20,
          left: targetRect.left - ew - this.pad
        }
      case 'left-bottom':
        return {
          top: targetRect.top + th / 2 - 18,
          left: targetRect.left - ew - this.pad
        }
      case 'right-top':
        return {
          top: targetRect.top + th / 2 - eh + 20,
          left: targetRect.left + tw + this.pad
        }
      case 'right-bottom':
        return {
          top: targetRect.top + th / 2 - 18,
          left: targetRect.left + tw + this.pad
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

  /////
  // Compute the "suggested" position favouring `pos`.
  //
  // Returns `pos` if no suggestion can be determined.
  //
  // @param {String} pos
  // @param {Object} tipRect
  // @param {Object} targetRect
  // @return {Array[String,Object]}
  //
  suggested(preference, tipRect, targetRect) {
    const h = this.el.clientHeight
    const w = this.el.clientWidth
    const port = viewport.value
    var bestArea = -Infinity
    var bestPos
    var bestOffset
    var maxArea = w * h
    var positions = genPositions(preference.split('-'))
    for (var i = 0; i < positions.length; i++) {
      var pos = positions[i]
      var off = this.offset(pos, tipRect, targetRect)
      var offBottom = port.height - h - off.top
      var offRight = port.width - w - off.left
      var yVisible = h
      if (off.top < 0) yVisible += off.top
      if (offBottom < 0) yVisible += offBottom
      var xVisible = w
      if (off.left < 0) xVisible += off.left
      if (offRight < 0) xVisible += offRight
      var area = Math.max(xVisible, 0) * Math.max(yVisible, 0)
      // the first position that shows all the tip
      if (area == maxArea) return [pos, off]
      // shows more of the tip than the other positions
      if (area > bestArea) {bestArea = area; bestPos = pos; bestOffset = off}
    }
    return [bestPos, bestOffset]
  }
}

const concat = [].concat

// top, bottom, left, right in order of preference
const genPositions = ([first, second]) =>
  concat.call(genSecondary(first, second),
              genSecondary(opposite[first], second),
              genSecondary(adjacent[first]),
              genSecondary(opposite[adjacent[first]]))

// top, top-left, top-right in order of preference
const genSecondary = (first, second) => {
  return second !== undefined
    ? [first + '-' + second,
       first,
       first + '-' + opposite[second]]
    : [first,
       first + '-' + adjacent[first],
       first + '-' + opposite[adjacent[first]]]
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
