<style>
.apps-container {
  display: flex;
  flex-direction: column;
  gap: 40px;
  margin: 40px auto;
  max-width: 700px;
}
.app-item {
  display: flex;
  gap: 20px;
  align-items: center;
}
.app-icon {
  width: 128px;
  height: 128px;
  min-width: 128px;
  min-height: 128px;
  flex-shrink: 0;
}
.app-info h3 {
  margin-top: 0;
  margin-bottom: 10px;
}
.app-info p {
  margin: 0;
  color: #666;
}
.app-info a {
  text-decoration: none;
  color: inherit;
}
.app-info a:hover {
  opacity: 0.8;
}
</style>

<div class="apps-container">
  <div class="app-item">
    <a href="/photocurves/">
      <img src="/images/photocurves_icon_rounded_256x256.png" alt="Photo Curves" class="app-icon" />
    </a>
    <div class="app-info">
      <a href="/photocurves/"><h3>Photo Curves</h3></a>
      <p>Color grading image editor and 3D LUTs creator. Available on Android, iOS, macOS, and Web.</p>
    </div>
  </div>
  <div class="app-item">
    <a href="/lullwave/">
      <img src="/images/lullwave_icon_rounded_256x256.png" alt="Lullwave" class="app-icon" />
    </a>
    <div class="app-info">
      <a href="/lullwave/"><h3>Lullwave</h3></a>
      <p>Noises and sounds for sleep and relaxation. Calming sounds and a full range of colored noises.</p>
    </div>
  </div>
</div>
