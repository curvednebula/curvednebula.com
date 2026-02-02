<style>
.apps-container {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  margin: 2.5rem auto;
  max-width: 45rem;
}
.app-item {
  display: flex;
  gap: 1.25rem;
  align-items: center;
}
.app-icon {
  width: 8rem;
  height: 8rem;
  min-width: 8rem;
  min-height: 8rem;
  flex-shrink: 0;
}
.app-info h3 {
  margin-top: 0;
  margin-bottom: 0.625rem;
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
.copyright {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
  color: #666;
  font-size: 0.875rem;
  background-color: white;
  padding: 0.625rem 0;
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

<div class="copyright">
  © 2020-2026 Curved Nebula
</div>
