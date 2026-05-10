const ImageCard = {
  props: {
    num: {
      type: Number,
      required: true,
    },
    t: {
      type: String,
      required: true,
    },
    a: {
      type: String,
      required: true,
    },
    bitmap: {
      type: Array,
      required: true,
    },
  },
  emits: ["save"],
  computed: {
    imageUrl() {
      return `res/${this.t}/${this.a}/${this.num}`;
    },
    isClicked() {
      return this.bitmap[this.num - 1] === 1;
    },
  },
  template: `
      <div class="relative overflow-hidden rounded-lg shadow-md">
        <a :href="imageUrl">
          <img loading="lazy" :src="imageUrl" alt="Image" class="w-full h-auto transition-transform duration-500" />
        </a>
        <button class="button" 
                :class="{ red: isClicked }" 
                @click="saveImage(num)">
          <i class="fas fa-heart heart"></i>
        </button>
      </div>
    `,
  methods: {
    saveImage(num) {
      this.$emit("save", num);
    },
  },
};
