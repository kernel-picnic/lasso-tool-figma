<template>
  <div class="instruction">
    <div class="demo">
      <div class="container">
        <template v-if="started">
          <img src="@ui/assets/shapes.svg" class="shapes" alt="" />

          <svg
            width="170"
            height="150"
            viewBox="0 0 170 150"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            class="path"
          >
            <path
              ref="path"
              d="M89.906 57.0001C114.906 42.5001 94.4997 -6.50008 147.406 2.24248C200.312 10.985 146.812 145.782 89.906 149.243C33 152.703 -27.002 38.4997 14.9997 16.4999C57.0014 -5.49984 64.906 71.5 89.906 57.0001Z"
              stroke="#fff"
            />
          </svg>
        </template>
        <img v-else src="@ui/assets/figma-ui.svg" alt="" />

        <img
          src="@ui/assets/cursor.svg"
          :class="['cursor', { moving: started }]"
          :style="cursorStyles"
          alt=""
        />
      </div>
      <div class="text">Click to page to start selecting</div>
    </div>
    <button type="button" @click="$emit('cancel')">Cancel</button>
  </div>
</template>

<script>
import { Actions } from '@common/types/actions'

export default {
  name: 'LassoInstruction',
  emits: ['cancel'],
  data() {
    return {
      started: false,
      animationProgress: 0,
      cursorStyles: {},
    }
  },
  mounted() {
    window.addEventListener('message', this.handleMessages)
  },
  beforeUnmount() {
    window.removeEventListener('message', this.handleMessages)
    clearInterval(this.animation)
  },
  methods: {
    async startAnimation() {
      this.started = true
      await this.$nextTick()
      const path = this.$refs.path
      const pathLength = parseFloat(path.getTotalLength())
      path.style.strokeDasharray = pathLength + ' ' + pathLength
      let paused = false
      const moveCursor = async () => {
        if (paused) {
          return
        }
        if (this.animationProgress >= pathLength) {
          paused = true
          // Pause until next moving
          setTimeout(() => {
            this.animationProgress = 0
            paused = false
          }, 2000)
        }
        // Get the new position of the circle on the path
        let pos = path.getPointAtLength(
          (pathLength * ++this.animationProgress) / pathLength,
        )
        this.cursorStyles = {
          transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        }
        path.style.strokeDashoffset = pathLength - this.animationProgress
      }
      this.animation = setInterval(moveCursor, 10)
    },
    handleMessages({ data }) {
      const message = data.pluginMessage

      switch (message.action) {
        case Actions.SELECT_START:
          this.startAnimation()
          break
      }
    },
  },
}
</script>

<style scoped>
.instruction {
  padding: 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  font-family: Arial, sans-serif; /* TODO: use own font */
}

.demo {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 30px;
}

.container {
  position: relative;
  margin-bottom: 30px;
  width: 100%;
}

.shapes {
  width: 160px;
  opacity: 0.5;
}

.path {
  position: absolute;
  inset: 0;
  margin: auto;
}

@keyframes cursor-click {
  0%,
  79% {
    transform: scale(1);
  }

  80% {
    transform: scale(0.8);
  }

  92% {
    transform: scale(1.1);
  }

  100% {
    transform: scale(1);
  }
}

.cursor {
  position: absolute;
  inset: 65px auto auto 110px;
  margin: auto;
  width: 40px;
  height: 40px;

  &:not(.moving) {
    animation: cursor-click 3s infinite;
  }

  &.moving {
    top: 0;
    left: 33px;
  }
}
</style>
