import {style} from 'easy-style'
import viewport from 'viewport'
import {Thunk} from 'mana'

const className = style({
  position: 'absolute',
  zIndex: 1000,
  top: 0,
  left: 0,
  padding: 10,
  border: '1px solid rgb(190,190,190)',
  borderRadius: 2,
  background: 'white',
  textAlign: 'center',
  '&.fade': {transition: 'opacity 300ms 100ms'},
  '&.fade.hide': {opacity: 0},
  '&::after': {
    borderRadius: '20% 0 0 0',
    content: "''",
    position: 'absolute',
    width: 15,
    height: 15,
    background: 'inherit',
    border: 'inherit',
    zIndex: -1,
    borderBottom: 'none',
    borderRight: 'none'
  },
  '&.top::after, &.top-left::after, &.top-right::after': {
    transform: 'rotate(-135deg) translate(30%, 30%)',
    top: '100%',
  },
  '&.bottom::after, &.bottom-left::after, &.bottom-right::after': {
    transform: 'rotate(45deg) translate(30%, 30%)',
    bottom: '100%'
  },
  '&.top::after, &.bottom::after': {
    left: 'calc(50% - 7.5px)'
  },
  '&.top-left::after, &.bottom-left::after': {right: 10},
  '&.top-right::after, &.bottom-right::after': {left: 10},
  '&.left::after, &.left-top::after, &.left-bottom::after': {
    transform: 'rotate(135deg) translate(30%, 30%)',
    left: '100%'
  },
  '&.left-top::after, &.right-top::after': { bottom: 10 },
  '&.left-bottom::after, &.right-bottom::after': { top: 10 },
  '&.right::after, &.left::after': {top: 'calc(50% - 7.5px)'},
  '&.right::after, &.right-top::after, &.right-bottom::after': {
    transform: 'rotate(315deg) translate(30%, 30%)',
    right: '100%'
  }
})

export const stack = []

const events = {
  onMouseEnter(e, {tip_options}, dom) {
    if (tip_options.solo) {
      stack.forEach(tip => tip.hide())
      stack.push(dom.tip)
    }
    dom.tip.show()
  },
  onMouseLeave(e, {tip_options}, dom) {
    dom.tip.hide()
    if (tip_options.solo) {
      stack.pop()
      const end = stack.length - 1
      end >= 0 && stack[end].show()
    }
  }
}

/////
// Bind a tool tip to be displayed around a target node when the user
// hovers their mouse over it. It will automatically choose the best
// position depending on where room is availabe in the viewport
//
// @param  {Object} options
// @param  {Array{VirtualElement}} target
// @return {target}
//
export default class Tip extends Thunk {
  render(options, [target]) {
    options.content = options.content.assoc({className})
    if (typeof options.show != 'boolean') {
      options.content.mergeParams(events)
      target = target.assoc(events)
    }
    options.content.tip_options = options
    target.tip_options = options
    return target
  }

  onMount(dom) {
    const options = this.arguments[0]
    dom.tip = new Engine(options.content, dom, options)
    if (options.show === true) events.onMouseEnter(null, this.node, dom)
  }

  onUnMount(dom) {
    dom.tip && events.onMouseLeave(null, this.node, dom)
  }
}

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
    this.node = node
    if (effect) this.node.mergeParams({class: `${effect} hide`})
    this.position = position.replace(/\s+/g, '-')
    this.pad = padding
    this.auto = auto
    this.delay = effect == null ? 0 : delay
  }

  show() {
    clearTimeout(this._hide)
    if (this.binding) return this.el.classList.remove('hide')

    this.el = this.node.mountIn(document.body)
    this.el.tip = this
    // defer so animations css animations can work
    requestAnimationFrame(() => {
      this.reposition(viewport.value)
      this.el.classList.remove('hide')
    })
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
    this.el.classList.add(this.currentPosition = pos)
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
        throw new Error(`invalid position "${pos}"`)
    }
  }

  hide() {
    if (!this.el) return
    this.el.classList.add('hide')
    if (this.delay) {
      this._hide = setTimeout((() => this.remove()), this.delay)
    } else {
      this.remove()
    }
  }

  remove() {
    if (this.el.parentNode) this.node.remove(this.el)
    viewport.removeListener(this.binding)
    this.currentPosition = null
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
