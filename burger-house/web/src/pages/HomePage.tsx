import { AboutSection } from '../components/AboutSection';
import { HeroSlider } from '../components/HeroSlider';
import { HotDeals } from '../components/HotDeals';
import { MenuSection } from '../components/MenuSection';
import { ReviewsSection } from '../components/ReviewsSection';
import { SocialSection } from '../components/SocialSection';

export function HomePage() {
  return (
    <main id="main">
      <HeroSlider />
      <MenuSection />
      <HotDeals />
      <AboutSection />
      <ReviewsSection />
      <SocialSection />
    </main>
  );
}
