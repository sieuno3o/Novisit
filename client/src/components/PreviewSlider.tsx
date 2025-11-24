import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";

// Swiper 기본 스타일
import "swiper/css";
import "swiper/css/navigation";

import "./PreviewSlider.scss";

type Slide = {
  id: number;
  image: string;
  alt: string;
};

const slides: Slide[] = [
  { id: 1, image: "/assets/img/sliderNotice.png", alt: "알림" },
  { id: 2, image: "/assets/img/sliderMy.png", alt: "마이" },
  { id: 3, image: "/assets/img/sliderMain.png", alt: "메인" },
];

const PreviewSlider: React.FC = () => {
  return (
    <div className="preview-slider">
      <Swiper
        className="preview-swiper"
        modules={[Navigation]}
        navigation
        centeredSlides={true}
        slidesPerView={"auto"}
        spaceBetween={5}
        loop={false}
        grabCursor={true}
      >
        {slides.map((slide) => (
          <SwiperSlide key={slide.id} className="preview-slide">
            <div className="preview-slide__inner">
              <img
                src={slide.image}
                alt={slide.alt}
                className="preview-slide__image"
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default PreviewSlider;