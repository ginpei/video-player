<script lang="ts">
  let videoUrl = ''
</script>

<div class="w-full max-w-4xl mx-auto p-4">
  <div class="bg-gray-900 rounded-lg overflow-hidden shadow-xl">
    <!-- Video element -->
    <video
      class="w-full"
      controls
      src={videoUrl}
    >
      <track kind="captions" />
    </video>
  </div>

  <!-- URL input for testing -->
  <div class="mt-4">
    <input
      type="text"
      bind:value={videoUrl}
      placeholder="Enter video URL"
      class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </div>
</div>
